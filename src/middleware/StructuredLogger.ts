/**
 * Structured Logging Enhancement
 * Cannibalized from winston/pino patterns
 * Enhanced logger with request context and structured output
 */

import Logger from '../utils/Logger'
import { Request, Response, NextFunction } from 'express'

interface LogContext {
    requestId?: string
    method?: string
    url?: string
    statusCode?: number
    duration?: number
    userId?: string
    ip?: string
    userAgent?: string
}

/**
 * Enhanced logger with structured context
 */
export class StructuredLogger {
    /**
     * Log with context
     */
    static logWithContext(level: 'info' | 'warn' | 'error' | 'debug', message: string, context: LogContext = {}) {
        const timestamp = new Date().toISOString()

        const logEntry = {
            timestamp,
            level,
            message,
            ...context,
        }

        // Format for console
        const contextStr = Object.entries(context)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => `${key}=${value}`)
            .join(' ')

        const fullMessage = contextStr
            ? `[${timestamp}] ${message} ${contextStr}`
            : `[${timestamp}] ${message}`

        // Use existing logger
        switch (level) {
            case 'info':
                Logger.d(fullMessage)
                break
            case 'warn':
                Logger.w(fullMessage)
                break
            case 'error':
                Logger.e(fullMessage)
                break
            case 'debug':
                Logger.d(fullMessage)
                break
        }

        return logEntry
    }

    static info(message: string, context?: LogContext) {
        return this.logWithContext('info', message, context)
    }

    static warn(message: string, context?: LogContext) {
        return this.logWithContext('warn', message, context)
    }

    static error(message: string, context?: LogContext) {
        return this.logWithContext('error', message, context)
    }

    static debug(message: string, context?: LogContext) {
        return this.logWithContext('debug', message, context)
    }
}

/**
 * Request logging middleware with structured output
 * Cannibalized from morgan/pino-http patterns
 */
export function structuredRequestLogger(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()

    // Extract request context
    const context: LogContext = {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: (req.headers['x-real-ip'] as string) ||
            (req.headers['x-forwarded-for'] as string) ||
            req.ip,
        userAgent: req.headers['user-agent'] as string,
    }

    // Log request start
    StructuredLogger.info('HTTP Request', context)

    // Capture response
    const originalSend = res.send
    res.send = function (data: any) {
        const duration = Date.now() - startTime

        // Log response
        StructuredLogger.info('HTTP Response', {
            ...context,
            statusCode: res.statusCode,
            duration,
        })

        return originalSend.call(res, data)
    }

    next()
}

export default StructuredLogger
