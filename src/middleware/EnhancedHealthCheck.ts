/**
 * Enhanced Health Check System
 * Cannibalized from terminus, lightship, and kubernetes health check patterns
 * Provides detailed health status for monitoring and orchestration
 */

import { Request, Response, NextFunction } from 'express'
import ApiStatusCodes from '../api/ApiStatusCodes'
import BaseApi from '../api/BaseApi'
import Logger from '../utils/Logger'

interface HealthCheck {
    name: string
    check: () => Promise<HealthStatus>
}

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy'
    message?: string
    details?: any
}

interface SystemHealth {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    checks: {
        [key: string]: HealthStatus & { duration: number }
    }
}

class HealthCheckSystem {
    private checks: Map<string, HealthCheck> = new Map()
    private startTime = Date.now()

    /**
     * Register a health check
     */
    registerCheck(name: string, check: () => Promise<HealthStatus>) {
        this.checks.set(name, { name, check })
        Logger.d(`Registered health check: ${name}`)
    }

    /**
     * Run all health checks
     */
    async runChecks(): Promise<SystemHealth> {
        const results: SystemHealth = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            checks: {},
        }

        const checkPromises = Array.from(this.checks.values()).map(async (healthCheck) => {
            const startTime = Date.now()
            try {
                const result = await Promise.race([
                    healthCheck.check(),
                    // Timeout check after 5 seconds
                    new Promise<HealthStatus>((_, reject) =>
                        setTimeout(() => reject(new Error('Health check timeout')), 5000)
                    ),
                ])

                const duration = Date.now() - startTime

                results.checks[healthCheck.name] = {
                    ...result,
                    duration,
                }

                // Update overall status
                if (result.status === 'unhealthy') {
                    results.status = 'unhealthy'
                } else if (result.status === 'degraded' && results.status !== 'unhealthy') {
                    results.status = 'degraded'
                }
            } catch (err: any) {
                const duration = Date.now() - startTime
                results.checks[healthCheck.name] = {
                    status: 'unhealthy',
                    message: err.message || 'Health check failed',
                    duration,
                }
                results.status = 'unhealthy'
            }
        })

        await Promise.all(checkPromises)

        return results
    }

    /**
     * Get simple liveness check (always returns true unless shutting down)
     */
    liveness(): boolean {
        return true
    }

    /**
     * Get readiness check (checks if system is ready to serve traffic)
     */
    async readiness(): Promise<boolean> {
        const health = await this.runChecks()
        return health.status !== 'unhealthy'
    }
}

// Singleton instance
const healthCheckSystem = new HealthCheckSystem()

// Register default health checks
healthCheckSystem.registerCheck('memory', async () => {
    const usage = process.memoryUsage()
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100

    if (heapUsedPercent > 90) {
        return {
            status: 'unhealthy',
            message: 'Memory usage critical',
            details: {
                heapUsedPercent: heapUsedPercent.toFixed(2),
                heapUsed: Math.floor(usage.heapUsed / 1024 / 1024),
                heapTotal: Math.floor(usage.heapTotal / 1024 / 1024),
            },
        }
    } else if (heapUsedPercent > 75) {
        return {
            status: 'degraded',
            message: 'Memory usage high',
            details: {
                heapUsedPercent: heapUsedPercent.toFixed(2),
                heapUsed: Math.floor(usage.heapUsed / 1024 / 1024),
                heapTotal: Math.floor(usage.heapTotal / 1024 / 1024),
            },
        }
    }

    return {
        status: 'healthy',
        details: {
            heapUsedPercent: heapUsedPercent.toFixed(2),
            heapUsed: Math.floor(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.floor(usage.heapTotal / 1024 / 1024),
        },
    }
})

healthCheckSystem.registerCheck('eventLoop', async () => {
    // Simple event loop lag check
    const start = Date.now()
    await new Promise(resolve => setImmediate(resolve))
    const lag = Date.now() - start

    if (lag > 1000) {
        return {
            status: 'unhealthy',
            message: 'Event loop blocked',
            details: { lagMs: lag },
        }
    } else if (lag > 100) {
        return {
            status: 'degraded',
            message: 'Event loop slow',
            details: { lagMs: lag },
        }
    }

    return {
        status: 'healthy',
        details: { lagMs: lag },
    }
})

/**
 * Detailed health check endpoint
 */
export function detailedHealthCheck() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const health = await healthCheckSystem.runChecks()

            const statusCode = health.status === 'healthy' ? 200 :
                              health.status === 'degraded' ? 200 : 503

            res.status(statusCode).send({
                ...health,
                version: process.env.npm_package_version || 'unknown',
                node: process.version,
            })
        } catch (err: any) {
            Logger.e(`Health check error: ${err.message}`)
            res.status(503).send({
                status: 'unhealthy',
                message: err.message,
                timestamp: new Date().toISOString(),
            })
        }
    }
}

/**
 * Kubernetes-style liveness probe
 */
export function livenessProbe() {
    return (req: Request, res: Response) => {
        if (healthCheckSystem.liveness()) {
            res.status(200).send('OK')
        } else {
            res.status(503).send('NOT OK')
        }
    }
}

/**
 * Kubernetes-style readiness probe
 */
export function readinessProbe() {
    return async (req: Request, res: Response) => {
        const ready = await healthCheckSystem.readiness()
        if (ready) {
            res.status(200).send('READY')
        } else {
            res.status(503).send('NOT READY')
        }
    }
}

export { healthCheckSystem }
export default healthCheckSystem
