/**
 * Rate Limiting Middleware
 * Cannibalized from express-rate-limit pattern
 * Simple in-memory rate limiter for API endpoints
 */

import { Request, Response, NextFunction } from 'express'
import Logger from '../utils/Logger'
import ApiStatusCodes from '../api/ApiStatusCodes'
import BaseApi from '../api/BaseApi'

interface RateLimitStore {
    [key: string]: {
        count: number
        resetTime: number
    }
}

interface RateLimitConfig {
    windowMs: number // Time window in milliseconds
    max: number // Max requests per window
    message?: string
    skipSuccessfulRequests?: boolean
    skipFailedRequests?: boolean
    keyGenerator?: (req: Request) => string
}

class RateLimiter {
    private store: RateLimitStore = {}
    private cleanupInterval: NodeJS.Timeout

    constructor(private config: RateLimitConfig) {
        // Cleanup old entries every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanup()
        }, 60000)
    }

    private cleanup(): void {
        const now = Date.now()
        let cleaned = 0

        for (const key in this.store) {
            if (this.store[key].resetTime < now) {
                delete this.store[key]
                cleaned++
            }
        }

        if (cleaned > 0) {
            Logger.d(`RateLimiter: Cleaned ${cleaned} expired entries`)
        }
    }

    private getKey(req: Request): string {
        if (this.config.keyGenerator) {
            return this.config.keyGenerator(req)
        }

        // Default: Use IP address
        const ip = (req.headers['x-forwarded-for'] as string) ||
                   (req.headers['x-real-ip'] as string) ||
                   req.ip ||
                   req.socket.remoteAddress ||
                   'unknown'

        return `${req.path}:${ip}`
    }

    middleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            const key = this.getKey(req)
            const now = Date.now()

            // Initialize or get existing entry
            if (!this.store[key] || this.store[key].resetTime < now) {
                this.store[key] = {
                    count: 0,
                    resetTime: now + this.config.windowMs,
                }
            }

            const entry = this.store[key]

            // Increment count
            entry.count++

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', this.config.max)
            res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.max - entry.count))
            res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())

            // Check if limit exceeded
            if (entry.count > this.config.max) {
                Logger.w(`Rate limit exceeded for ${key}: ${entry.count}/${this.config.max}`)

                const message = this.config.message ||
                    `Too many requests from this IP, please try again after ${Math.ceil(this.config.windowMs / 1000)} seconds`

                res.status(429).send(
                    new BaseApi(ApiStatusCodes.STATUS_ERROR_GENERIC, message)
                )
                return
            }

            // Store response handler to update count based on success/failure
            const originalSend = res.send
            res.send = function (data: any) {
                const statusCode = res.statusCode

                // Skip counting successful requests if configured
                if (this.config.skipSuccessfulRequests && statusCode < 400) {
                    entry.count--
                }

                // Skip counting failed requests if configured
                if (this.config.skipFailedRequests && statusCode >= 400) {
                    entry.count--
                }

                return originalSend.call(res, data)
            }.bind(this)

            next()
        }
    }

    stop(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
        }
    }
}

// Pre-configured rate limiters for common use cases

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes
 */
export function createAuthRateLimiter(): (req: Request, res: Response, next: NextFunction) => void {
    const limiter = new RateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: 'Too many login attempts from this IP, please try again after 15 minutes',
        skipSuccessfulRequests: true, // Only count failed login attempts
    })

    return limiter.middleware()
}

/**
 * Standard rate limiter for API endpoints
 * 100 requests per minute
 */
export function createApiRateLimiter(): (req: Request, res: Response, next: NextFunction) => void {
    const limiter = new RateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 100,
        message: 'Too many API requests, please slow down',
    })

    return limiter.middleware()
}

/**
 * Strict rate limiter for deployment operations
 * 10 requests per minute
 */
export function createDeploymentRateLimiter(): (req: Request, res: Response, next: NextFunction) => void {
    const limiter = new RateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        message: 'Too many deployment requests, please wait before deploying again',
    })

    return limiter.middleware()
}

export default RateLimiter
