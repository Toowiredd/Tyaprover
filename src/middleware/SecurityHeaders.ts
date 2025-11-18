/**
 * Security Headers Middleware
 * Cannibalized from helmet.js patterns
 * Adds security headers to all responses
 */

import { Request, Response, NextFunction } from 'express'

/**
 * Security headers middleware
 * Implements common security best practices
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // Enable browser XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block')

    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Permissions Policy (formerly Feature-Policy)
    res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()'
    )

    // Remove X-Powered-By header to avoid exposing technology stack
    res.removeHeader('X-Powered-By')

    // Content Security Policy (basic - can be customized)
    // Note: This is commented out as it may break existing functionality
    // Uncomment and customize as needed
    // res.setHeader(
    //     'Content-Security-Policy',
    //     "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    // )

    next()
}

/**
 * Strict Transport Security (HSTS) middleware
 * Forces HTTPS connections
 */
export function hstsMiddleware(maxAge: number = 31536000) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Only set HSTS if connection is HTTPS
        const isHttps = req.secure || req.get('X-Forwarded-Proto') === 'https'

        if (isHttps) {
            res.setHeader(
                'Strict-Transport-Security',
                `max-age=${maxAge}; includeSubDomains; preload`
            )
        }

        next()
    }
}

/**
 * Combined security middleware
 */
export function applySecurityHeaders(enableHSTS: boolean = true): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
        // Apply basic security headers
        securityHeadersMiddleware(req, res, () => {
            // Apply HSTS if enabled
            if (enableHSTS) {
                hstsMiddleware()(req, res, next)
            } else {
                next()
            }
        })
    }
}

export default securityHeadersMiddleware
