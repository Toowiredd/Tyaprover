/**
 * Request Correlation ID Middleware
 * Cannibalized from express-request-id and uuid patterns
 * Adds unique ID to each request for distributed tracing
 */

import { Request, Response, NextFunction } from 'express'
import * as crypto from 'crypto'

// Extend Express Request type to include requestId
declare global {
    namespace Express {
        interface Request {
            id?: string
        }
    }
}

/**
 * Generate a unique request ID
 * Using crypto.randomBytes for better uniqueness than UUID v4
 */
function generateRequestId(): string {
    return crypto.randomBytes(16).toString('hex')
}

/**
 * Request ID middleware
 * Adds unique ID to each request and includes it in response headers
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Check if request already has an ID (from upstream proxy/load balancer)
    const existingId =
        req.headers['x-request-id'] as string ||
        req.headers['x-correlation-id'] as string

    // Use existing ID or generate new one
    const requestId = existingId || generateRequestId()

    // Attach to request object
    req.id = requestId

    // Add to response headers
    res.setHeader('X-Request-ID', requestId)

    next()
}

/**
 * Request timing middleware
 * Tracks request duration and adds to response headers
 */
export function requestTimingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now()

    // Override res.send to calculate duration
    const originalSend = res.send
    res.send = function (data: any) {
        const duration = Date.now() - startTime

        // Add timing header
        res.setHeader('X-Response-Time', `${duration}ms`)

        // Call original send
        return originalSend.call(res, data)
    }

    next()
}

/**
 * Combined request tracking middleware
 * Includes both ID and timing
 */
export function requestTrackerMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Add request ID
    requestIdMiddleware(req, res, () => {
        // Add request timing
        requestTimingMiddleware(req, res, next)
    })
}

export default requestTrackerMiddleware
