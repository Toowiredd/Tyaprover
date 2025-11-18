/**
 * Distributed Tracing Support
 *
 * Patterns cannibalized from:
 * - OpenTelemetry (open standard for distributed tracing)
 * - Jaeger client
 * - Zipkin
 * - AWS X-Ray
 *
 * Zero external dependencies - implemented from scratch
 *
 * Features:
 * - OpenTelemetry-compatible trace/span IDs
 * - Parent/child span relationships
 * - Span duration tracking
 * - Span attributes (tags)
 * - Span events (logs within spans)
 * - Context propagation (W3C Trace Context)
 * - Export to multiple backends (console, HTTP endpoint)
 * - Sampling support
 *
 * Usage:
 * // Automatic HTTP tracing
 * app.use(distributedTracingMiddleware())
 *
 * // Manual span creation
 * const span = tracer.startSpan('operation-name', { parentSpan })
 * span.setAttribute('key', 'value')
 * span.end()
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * Generate OpenTelemetry-compatible trace ID (32 hex characters)
 */
function generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex')
}

/**
 * Generate OpenTelemetry-compatible span ID (16 hex characters)
 */
function generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex')
}

export enum SpanKind {
    INTERNAL = 'INTERNAL',
    SERVER = 'SERVER',
    CLIENT = 'CLIENT',
    PRODUCER = 'PRODUCER',
    CONSUMER = 'CONSUMER',
}

export enum SpanStatus {
    UNSET = 'UNSET',
    OK = 'OK',
    ERROR = 'ERROR',
}

interface SpanEvent {
    name: string
    timestamp: number
    attributes?: Record<string, any>
}

interface SpanContext {
    traceId: string
    spanId: string
    parentSpanId?: string
    traceFlags: number // 1 = sampled, 0 = not sampled
}

export class Span {
    private context: SpanContext
    private name: string
    private kind: SpanKind
    private startTime: number
    private endTime?: number
    private attributes: Record<string, any> = {}
    private events: SpanEvent[] = []
    private status: SpanStatus = SpanStatus.UNSET
    private statusMessage?: string

    constructor(
        name: string,
        context: SpanContext,
        kind: SpanKind = SpanKind.INTERNAL
    ) {
        this.name = name
        this.context = context
        this.kind = kind
        this.startTime = Date.now()
    }

    setAttribute(key: string, value: any): this {
        this.attributes[key] = value
        return this
    }

    setAttributes(attributes: Record<string, any>): this {
        Object.assign(this.attributes, attributes)
        return this
    }

    addEvent(name: string, attributes?: Record<string, any>): this {
        this.events.push({
            name,
            timestamp: Date.now(),
            attributes,
        })
        return this
    }

    setStatus(status: SpanStatus, message?: string): this {
        this.status = status
        this.statusMessage = message
        return this
    }

    recordException(exception: Error): this {
        this.setStatus(SpanStatus.ERROR, exception.message)
        this.addEvent('exception', {
            'exception.type': exception.name,
            'exception.message': exception.message,
            'exception.stacktrace': exception.stack,
        })
        return this
    }

    end(): void {
        if (!this.endTime) {
            this.endTime = Date.now()
            TracerProvider.getInstance().recordSpan(this)
        }
    }

    getContext(): SpanContext {
        return this.context
    }

    toJSON() {
        return {
            traceId: this.context.traceId,
            spanId: this.context.spanId,
            parentSpanId: this.context.parentSpanId,
            name: this.name,
            kind: this.kind,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime ? this.endTime - this.startTime : undefined,
            attributes: this.attributes,
            events: this.events,
            status: this.status,
            statusMessage: this.statusMessage,
        }
    }
}

export interface TracerOptions {
    /** Service name for traces */
    serviceName?: string

    /** Sample rate (0-1, default: 1.0 - sample all) */
    sampleRate?: number
}

export class Tracer {
    private serviceName: string
    private sampleRate: number

    constructor(options: TracerOptions = {}) {
        this.serviceName = options.serviceName || 'tyaprover'
        this.sampleRate = options.sampleRate || 1.0
    }

    startSpan(
        name: string,
        options: {
            kind?: SpanKind
            parentSpan?: Span
            attributes?: Record<string, any>
        } = {}
    ): Span {
        const parentContext = options.parentSpan?.getContext()

        // Determine if we should sample this trace
        const shouldSample = !parentContext
            ? Math.random() < this.sampleRate
            : !!(parentContext.traceFlags & 1)

        const context: SpanContext = {
            traceId: parentContext?.traceId || generateTraceId(),
            spanId: generateSpanId(),
            parentSpanId: parentContext?.spanId,
            traceFlags: shouldSample ? 1 : 0,
        }

        const span = new Span(name, context, options.kind || SpanKind.INTERNAL)

        // Add service name
        span.setAttribute('service.name', this.serviceName)

        // Add custom attributes
        if (options.attributes) {
            span.setAttributes(options.attributes)
        }

        return span
    }

    /**
     * Start a span for an HTTP client request
     */
    startHttpClientSpan(
        method: string,
        url: string,
        options: { parentSpan?: Span } = {}
    ): Span {
        return this.startSpan(`HTTP ${method}`, {
            kind: SpanKind.CLIENT,
            parentSpan: options.parentSpan,
            attributes: {
                'http.method': method,
                'http.url': url,
                'span.kind': 'client',
            },
        })
    }

    /**
     * Wrap an async function with automatic span creation
     */
    traceAsync<T extends (...args: any[]) => Promise<any>>(
        name: string,
        fn: T,
        options: { parentSpan?: Span; attributes?: Record<string, any> } = {}
    ): T {
        const tracer = this

        return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
            const span = tracer.startSpan(name, {
                parentSpan: options.parentSpan,
                attributes: options.attributes,
            })

            try {
                const result = await fn(...args)
                span.setStatus(SpanStatus.OK)
                return result
            } catch (error) {
                span.recordException(error as Error)
                throw error
            } finally {
                span.end()
            }
        }) as T
    }
}

/**
 * Span exporter interface
 */
export interface SpanExporter {
    export(spans: Span[]): Promise<void>
}

/**
 * Console exporter (for development)
 */
export class ConsoleSpanExporter implements SpanExporter {
    async export(spans: Span[]): Promise<void> {
        for (const span of spans) {
            console.log('[Trace]', JSON.stringify(span.toJSON(), null, 2))
        }
    }
}

/**
 * HTTP exporter (for production - send to collector)
 */
export class HttpSpanExporter implements SpanExporter {
    private endpoint: string

    constructor(endpoint: string) {
        this.endpoint = endpoint
    }

    async export(spans: Span[]): Promise<void> {
        try {
            const data = spans.map(s => s.toJSON())

            // Use native http/https module to avoid dependencies
            const url = new URL(this.endpoint)
            const https = url.protocol === 'https:' ? require('https') : require('http')

            await new Promise((resolve, reject) => {
                const req = https.request(
                    {
                        hostname: url.hostname,
                        port: url.port,
                        path: url.pathname,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    },
                    (res: any) => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(true)
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}`))
                        }
                    }
                )

                req.on('error', reject)
                req.write(JSON.stringify(data))
                req.end()
            })
        } catch (error) {
            console.error('[HttpSpanExporter] Failed to export spans:', error)
        }
    }
}

/**
 * Tracer provider (singleton)
 */
class TracerProvider {
    private static instance: TracerProvider
    private tracer: Tracer
    private exporter: SpanExporter
    private spans: Span[] = []
    private batchSize = 10
    private flushInterval?: NodeJS.Timeout

    private constructor() {
        this.tracer = new Tracer({ serviceName: 'tyaprover' })
        this.exporter = new ConsoleSpanExporter()

        // Auto-flush every 5 seconds
        this.flushInterval = setInterval(() => {
            this.flush()
        }, 5000)

        if (this.flushInterval.unref) {
            this.flushInterval.unref()
        }
    }

    static getInstance(): TracerProvider {
        if (!TracerProvider.instance) {
            TracerProvider.instance = new TracerProvider()
        }
        return TracerProvider.instance
    }

    getTracer(): Tracer {
        return this.tracer
    }

    setExporter(exporter: SpanExporter): void {
        this.exporter = exporter
    }

    recordSpan(span: Span): void {
        this.spans.push(span)

        if (this.spans.length >= this.batchSize) {
            this.flush()
        }
    }

    async flush(): Promise<void> {
        if (this.spans.length === 0) return

        const toExport = this.spans.splice(0, this.spans.length)

        try {
            await this.exporter.export(toExport)
        } catch (error) {
            console.error('[TracerProvider] Failed to export spans:', error)
        }
    }

    async shutdown(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval)
        }
        await this.flush()
    }
}

/**
 * W3C Trace Context propagation
 * https://www.w3.org/TR/trace-context/
 */
export class TraceContext {
    /**
     * Parse traceparent header: 00-{trace-id}-{span-id}-{flags}
     */
    static parse(traceparent?: string): SpanContext | null {
        if (!traceparent) return null

        const parts = traceparent.split('-')
        if (parts.length !== 4) return null

        const [version, traceId, spanId, flags] = parts

        if (version !== '00') return null
        if (traceId.length !== 32 || spanId.length !== 16) return null

        return {
            traceId,
            spanId,
            traceFlags: parseInt(flags, 16),
        }
    }

    /**
     * Generate traceparent header from span context
     */
    static format(context: SpanContext): string {
        const flags = context.traceFlags.toString(16).padStart(2, '0')
        return `00-${context.traceId}-${context.spanId}-${flags}`
    }
}

/**
 * Express middleware for distributed tracing
 */
export interface DistributedTracingOptions {
    /** Service name (default: 'tyaprover') */
    serviceName?: string

    /** Sample rate 0-1 (default: 1.0) */
    sampleRate?: number

    /** Exporter endpoint (optional) */
    exporterEndpoint?: string
}

export function distributedTracingMiddleware(options: DistributedTracingOptions = {}) {
    const provider = TracerProvider.getInstance()

    // Configure tracer
    const tracer = new Tracer({
        serviceName: options.serviceName || 'tyaprover',
        sampleRate: options.sampleRate || 1.0,
    })

    // Configure exporter if endpoint provided
    if (options.exporterEndpoint) {
        provider.setExporter(new HttpSpanExporter(options.exporterEndpoint))
    }

    return function (req: Request, res: Response, next: NextFunction): void {
        // Parse incoming trace context
        const traceparent = req.headers['traceparent'] as string | undefined
        let parentContext = TraceContext.parse(traceparent)

        // Start server span
        const span = parentContext
            ? new Span(
                  `${req.method} ${req.route?.path || req.path}`,
                  {
                      traceId: parentContext.traceId,
                      spanId: generateSpanId(),
                      parentSpanId: parentContext.spanId,
                      traceFlags: parentContext.traceFlags,
                  },
                  SpanKind.SERVER
              )
            : tracer.startSpan(`${req.method} ${req.route?.path || req.path}`, {
                  kind: SpanKind.SERVER,
              })

        // Add HTTP attributes
        span.setAttributes({
            'http.method': req.method,
            'http.url': req.originalUrl || req.url,
            'http.host': req.get('host'),
            'http.scheme': req.protocol,
            'http.user_agent': req.get('user-agent'),
            'http.client_ip': req.ip,
        })

        // Store span in request for child spans
        ;(req as any).span = span

        // Inject trace context into response headers
        res.setHeader('traceparent', TraceContext.format(span.getContext()))

        // Track response
        const originalEnd = res.end.bind(res)
        res.end = function (chunk?: any, encoding?: any, callback?: any): any {
            span.setAttribute('http.status_code', res.statusCode)

            if (res.statusCode >= 400) {
                span.setStatus(SpanStatus.ERROR, `HTTP ${res.statusCode}`)
            } else {
                span.setStatus(SpanStatus.OK)
            }

            span.end()

            return originalEnd(chunk, encoding, callback)
        } as any

        next()
    }
}

/**
 * Get current span from request
 */
export function getCurrentSpan(req: Request): Span | undefined {
    return (req as any).span
}

/**
 * Export global tracer
 */
export const globalTracer = TracerProvider.getInstance().getTracer()

export default distributedTracingMiddleware
