/**
 * Request Timeout Middleware
 * Cannibalized from express-timeout-handler and connect-timeout patterns
 * Prevents hanging requests from consuming resources
 */

import { Request, Response, NextFunction } from 'express'
import Logger from '../utils/Logger'
import ApiStatusCodes from '../api/ApiStatusCodes'
import BaseApi from '../api/BaseApi'

interface TimeoutOptions {
    timeout?: number // Timeout in milliseconds (default 30000)
    onTimeout?: (req: Request, res: Response) => void
    excludePaths?: RegExp[]
}

/**
 * Request timeout middleware
 */
export function requestTimeout(options: TimeoutOptions = {}) {
    const timeout = options.timeout || 30000 // 30 seconds default
    const excludePaths = options.excludePaths || []
    const onTimeout = options.onTimeout

    return (req: Request, res: Response, next: NextFunction) => {
        // Check if path should be excluded
        const shouldExclude = excludePaths.some(pattern => pattern.test(req.path))
        if (shouldExclude) {
            return next()
        }

        let timeoutId: NodeJS.Timeout | null = null
        let isTimedOut = false

        // Set timeout
        timeoutId = setTimeout(() => {
            isTimedOut = true

            // Log timeout
            Logger.w(`Request timeout: ${req.method} ${req.path} (${timeout}ms)`, {
                requestId: req.id,
                ip: req.ip,
            })

            // Call custom handler if provided
            if (onTimeout) {
                onTimeout(req, res)
                return
            }

            // Send timeout response if not already sent
            if (!res.headersSent) {
                res.status(408).send(
                    new BaseApi(
                        ApiStatusCodes.STATUS_ERROR_GENERIC,
                        `Request timeout after ${timeout}ms. Please try again or contact support if this persists.`
                    )
                )
            }
        }, timeout)

        // Clear timeout on response
        const originalSend = res.send
        res.send = function (data: any) {
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }

            // Don't send if already timed out
            if (isTimedOut) {
                return res
            }

            return originalSend.call(res, data)
        }

        // Clear timeout on response finish
        res.on('finish', () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }
        })

        // Clear timeout on connection close
        req.on('close', () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }
        })

        next()
    }
}

/**
 * Create timeout middleware with custom settings
 */
export function createTimeout(timeoutMs: number, excludePaths: RegExp[] = []) {
    return requestTimeout({
        timeout: timeoutMs,
        excludePaths,
    })
}

/**
 * Standard API timeout (30 seconds)
 */
export function apiTimeout() {
    return requestTimeout({
        timeout: 30000,
        excludePaths: [
            /\/api\/v\d+\/user\/apps\/appdata\/[^/]+\/?$/, // Deployment endpoints
            /\/uploads?\//, // Upload endpoints
            /\/downloads?\//, // Download endpoints
        ],
    })
}

/**
 * Long operation timeout (5 minutes)
 */
export function longOperationTimeout() {
    return requestTimeout({
        timeout: 300000, // 5 minutes
    })
}

export default requestTimeout
