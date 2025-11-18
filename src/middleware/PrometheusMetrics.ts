/**
 * Prometheus Metrics Exporter
 *
 * Patterns cannibalized from:
 * - prom-client (Prometheus client for Node.js)
 * - express-prom-bundle
 * - prometheus-api-metrics
 *
 * Zero external dependencies - implemented from scratch
 *
 * Features:
 * - Standard Prometheus metrics format
 * - HTTP request duration histogram
 * - HTTP request counter by status code
 * - Active connections gauge
 * - System metrics (memory, CPU, event loop lag)
 * - Custom metrics registration
 * - /metrics endpoint for Prometheus scraping
 */

import { Request, Response, NextFunction } from 'express'

// Metric types
type MetricType = 'counter' | 'gauge' | 'histogram'

interface MetricValue {
    value: number
    labels?: Record<string, string>
    timestamp?: number
}

interface HistogramBucket {
    le: number // Less than or equal to
    count: number
}

interface HistogramValue {
    sum: number
    count: number
    buckets: HistogramBucket[]
}

interface Metric {
    name: string
    type: MetricType
    help: string
    values: Map<string, MetricValue | HistogramValue>
}

class PrometheusRegistry {
    private static instance: PrometheusRegistry
    private metrics: Map<string, Metric> = new Map()

    // Standard histogram buckets (in milliseconds for HTTP duration)
    private readonly defaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

    static getInstance(): PrometheusRegistry {
        if (!PrometheusRegistry.instance) {
            PrometheusRegistry.instance = new PrometheusRegistry()
            PrometheusRegistry.instance.initDefaultMetrics()
        }
        return PrometheusRegistry.instance
    }

    private initDefaultMetrics(): void {
        // HTTP request duration
        this.registerHistogram(
            'http_request_duration_ms',
            'Duration of HTTP requests in milliseconds',
            this.defaultBuckets
        )

        // HTTP request total
        this.registerCounter('http_requests_total', 'Total number of HTTP requests')

        // Active connections
        this.registerGauge('http_connections_active', 'Number of active HTTP connections')

        // Process metrics
        this.registerGauge('process_memory_heap_used_bytes', 'Process heap memory used in bytes')
        this.registerGauge('process_memory_heap_total_bytes', 'Process heap memory total in bytes')
        this.registerGauge('process_memory_rss_bytes', 'Process resident set size in bytes')
        this.registerGauge('process_event_loop_lag_ms', 'Event loop lag in milliseconds')
    }

    registerCounter(name: string, help: string): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, {
                name,
                type: 'counter',
                help,
                values: new Map(),
            })
        }
    }

    registerGauge(name: string, help: string): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, {
                name,
                type: 'gauge',
                help,
                values: new Map(),
            })
        }
    }

    registerHistogram(name: string, help: string, buckets: number[]): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, {
                name,
                type: 'histogram',
                help,
                values: new Map(),
            })
        }
    }

    incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
        const metric = this.metrics.get(name)
        if (!metric || metric.type !== 'counter') return

        const key = this.getLabelKey(labels)
        const current = metric.values.get(key) as MetricValue | undefined

        metric.values.set(key, {
            value: (current?.value || 0) + value,
            labels,
            timestamp: Date.now(),
        })
    }

    setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        const metric = this.metrics.get(name)
        if (!metric || metric.type !== 'gauge') return

        const key = this.getLabelKey(labels)
        metric.values.set(key, {
            value,
            labels,
            timestamp: Date.now(),
        })
    }

    observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
        const metric = this.metrics.get(name)
        if (!metric || metric.type !== 'histogram') return

        const key = this.getLabelKey(labels)
        let histogram = metric.values.get(key) as HistogramValue | undefined

        if (!histogram) {
            histogram = {
                sum: 0,
                count: 0,
                buckets: this.defaultBuckets.map(le => ({ le, count: 0 })),
            }
            metric.values.set(key, histogram)
        }

        histogram.sum += value
        histogram.count += 1

        // Update buckets
        for (const bucket of histogram.buckets) {
            if (value <= bucket.le) {
                bucket.count += 1
            }
        }
    }

    private getLabelKey(labels: Record<string, string>): string {
        if (Object.keys(labels).length === 0) return ''

        const sortedKeys = Object.keys(labels).sort()
        return sortedKeys.map(key => `${key}="${labels[key]}"`).join(',')
    }

    exportMetrics(): string {
        let output = ''

        // Update process metrics before exporting
        this.updateProcessMetrics()

        for (const metric of this.metrics.values()) {
            // Help text
            output += `# HELP ${metric.name} ${metric.help}\n`
            // Type
            output += `# TYPE ${metric.name} ${metric.type}\n`

            // Values
            if (metric.type === 'histogram') {
                for (const [labelKey, value] of metric.values.entries()) {
                    const histogram = value as HistogramValue
                    const labelStr = labelKey ? `{${labelKey}}` : ''

                    // Buckets
                    for (const bucket of histogram.buckets) {
                        output += `${metric.name}_bucket{${labelKey ? labelKey + ',' : ''}le="${bucket.le}"} ${bucket.count}\n`
                    }
                    output += `${metric.name}_bucket{${labelKey ? labelKey + ',' : ''}le="+Inf"} ${histogram.count}\n`

                    // Sum and count
                    output += `${metric.name}_sum${labelStr} ${histogram.sum}\n`
                    output += `${metric.name}_count${labelStr} ${histogram.count}\n`
                }
            } else {
                for (const [labelKey, value] of metric.values.entries()) {
                    const metricValue = value as MetricValue
                    const labelStr = labelKey ? `{${labelKey}}` : ''
                    output += `${metric.name}${labelStr} ${metricValue.value}\n`
                }
            }

            output += '\n'
        }

        return output
    }

    private updateProcessMetrics(): void {
        const memUsage = process.memoryUsage()

        this.setGauge('process_memory_heap_used_bytes', memUsage.heapUsed)
        this.setGauge('process_memory_heap_total_bytes', memUsage.heapTotal)
        this.setGauge('process_memory_rss_bytes', memUsage.rss)

        // Measure event loop lag (simple implementation)
        const start = Date.now()
        setImmediate(() => {
            const lag = Date.now() - start
            this.setGauge('process_event_loop_lag_ms', lag)
        })
    }

    reset(): void {
        this.metrics.clear()
        this.initDefaultMetrics()
    }
}

// Active connections tracking
let activeConnections = 0

/**
 * Middleware to track HTTP metrics
 */
export function prometheusMiddleware(req: Request, res: Response, next: NextFunction): void {
    const registry = PrometheusRegistry.getInstance()
    const start = Date.now()

    // Increment active connections
    activeConnections++
    registry.setGauge('http_connections_active', activeConnections)

    // Track response
    const originalEnd = res.end.bind(res)
    res.end = function (chunk?: any, encoding?: any, callback?: any): any {
        const duration = Date.now() - start
        const statusCode = res.statusCode.toString()
        const method = req.method
        const route = req.route?.path || req.path || 'unknown'

        // Record metrics
        registry.incrementCounter('http_requests_total', {
            method,
            route,
            status: statusCode,
        })

        registry.observeHistogram('http_request_duration_ms', duration, {
            method,
            route,
            status: statusCode,
        })

        // Decrement active connections
        activeConnections--
        registry.setGauge('http_connections_active', activeConnections)

        // Call original end
        return originalEnd(chunk, encoding, callback)
    } as any

    next()
}

/**
 * Handler for /metrics endpoint
 */
export function metricsEndpoint(req: Request, res: Response): void {
    const registry = PrometheusRegistry.getInstance()
    const metrics = registry.exportMetrics()

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    res.send(metrics)
}

/**
 * Export registry for custom metrics
 */
export const metricsRegistry = PrometheusRegistry.getInstance()

/**
 * Helper functions for custom metrics
 */
export const Metrics = {
    incrementCounter: (name: string, labels?: Record<string, string>, value?: number) => {
        metricsRegistry.incrementCounter(name, labels, value)
    },

    setGauge: (name: string, value: number, labels?: Record<string, string>) => {
        metricsRegistry.setGauge(name, value, labels)
    },

    observeHistogram: (name: string, value: number, labels?: Record<string, string>) => {
        metricsRegistry.observeHistogram(name, value, labels)
    },

    registerCounter: (name: string, help: string) => {
        metricsRegistry.registerCounter(name, help)
    },

    registerGauge: (name: string, help: string) => {
        metricsRegistry.registerGauge(name, help)
    },

    registerHistogram: (name: string, help: string, buckets: number[]) => {
        metricsRegistry.registerHistogram(name, help, buckets)
    },
}

export default prometheusMiddleware
