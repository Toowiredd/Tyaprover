/**
 * Advanced Caching Layer
 *
 * Patterns cannibalized from:
 * - node-cache (simple caching)
 * - lru-cache (Least Recently Used cache)
 * - apicache (API response caching)
 * - cache-manager
 *
 * Zero external dependencies - implemented from scratch
 *
 * Features:
 * - LRU (Least Recently Used) eviction
 * - TTL (Time To Live) support
 * - Memory-efficient storage
 * - Cache statistics
 * - Request/response caching middleware
 * - Function result caching (memoization)
 * - Cache invalidation patterns
 * - Configurable max size
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

interface CacheEntry<T = any> {
    key: string
    value: T
    expires: number
    createdAt: number
    accessCount: number
    lastAccess: number
    size: number // Approximate size in bytes
}

interface CacheOptions {
    /** Maximum number of items in cache (default: 500) */
    maxSize?: number

    /** Default TTL in milliseconds (default: 300000 - 5 minutes) */
    ttl?: number

    /** Check for expired items every X ms (default: 60000 - 1 minute) */
    checkPeriod?: number

    /** Enable LRU eviction (default: true) */
    useLRU?: boolean
}

interface CacheStats {
    hits: number
    misses: number
    keys: number
    size: number
    hitRate: number
}

class LRUCache<T = any> {
    private cache: Map<string, CacheEntry<T>> = new Map()
    private stats = {
        hits: 0,
        misses: 0,
    }

    private readonly options: Required<CacheOptions>
    private cleanupInterval?: NodeJS.Timeout

    constructor(options: CacheOptions = {}) {
        this.options = {
            maxSize: options.maxSize || 500,
            ttl: options.ttl || 300000, // 5 minutes
            checkPeriod: options.checkPeriod || 60000, // 1 minute
            useLRU: options.useLRU !== false,
        }

        // Start cleanup interval
        this.startCleanup()
    }

    set(key: string, value: T, ttl?: number): void {
        const now = Date.now()
        const expiresIn = ttl || this.options.ttl

        // Estimate size (rough approximation)
        const size = this.estimateSize(value)

        const entry: CacheEntry<T> = {
            key,
            value,
            expires: now + expiresIn,
            createdAt: now,
            accessCount: 0,
            lastAccess: now,
            size,
        }

        // Check if we need to evict
        if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
            this.evictLRU()
        }

        this.cache.set(key, entry)
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key)

        if (!entry) {
            this.stats.misses++
            return undefined
        }

        // Check expiration
        if (Date.now() > entry.expires) {
            this.cache.delete(key)
            this.stats.misses++
            return undefined
        }

        // Update access stats
        entry.accessCount++
        entry.lastAccess = Date.now()
        this.stats.hits++

        return entry.value
    }

    has(key: string): boolean {
        const entry = this.cache.get(key)
        if (!entry) return false

        // Check expiration
        if (Date.now() > entry.expires) {
            this.cache.delete(key)
            return false
        }

        return true
    }

    delete(key: string): boolean {
        return this.cache.delete(key)
    }

    clear(): void {
        this.cache.clear()
        this.stats.hits = 0
        this.stats.misses = 0
    }

    keys(): string[] {
        return Array.from(this.cache.keys())
    }

    private evictLRU(): void {
        if (!this.options.useLRU || this.cache.size === 0) return

        // Find least recently used entry
        let lruKey: string | null = null
        let lruTime = Date.now()

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccess < lruTime) {
                lruTime = entry.lastAccess
                lruKey = key
            }
        }

        if (lruKey) {
            this.cache.delete(lruKey)
        }
    }

    private cleanup(): void {
        const now = Date.now()
        const keysToDelete: string[] = []

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expires) {
                keysToDelete.push(key)
            }
        }

        for (const key of keysToDelete) {
            this.cache.delete(key)
        }
    }

    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup()
        }, this.options.checkPeriod)

        // Don't keep Node.js process alive
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref()
        }
    }

    private estimateSize(value: any): number {
        try {
            return JSON.stringify(value).length * 2 // Approximate UTF-16 bytes
        } catch {
            return 1000 // Default size if can't serialize
        }
    }

    getStats(): CacheStats {
        const totalRequests = this.stats.hits + this.stats.misses
        const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0

        let totalSize = 0
        for (const entry of this.cache.values()) {
            totalSize += entry.size
        }

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            keys: this.cache.size,
            size: totalSize,
            hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
        }
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
        }
        this.clear()
    }
}

/**
 * Global cache instance
 */
const globalCache = new LRUCache()

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
    const url = req.originalUrl || req.url
    const method = req.method
    const query = JSON.stringify(req.query)
    const body = req.method === 'POST' || req.method === 'PUT' ? JSON.stringify(req.body) : ''

    return crypto
        .createHash('md5')
        .update(`${method}:${url}:${query}:${body}`)
        .digest('hex')
}

/**
 * HTTP Response cache middleware
 */
export interface ResponseCacheOptions {
    /** TTL in milliseconds (default: 300000 - 5 minutes) */
    ttl?: number

    /** Only cache these HTTP methods (default: ['GET', 'HEAD']) */
    methods?: string[]

    /** Only cache these status codes (default: [200]) */
    statusCodes?: number[]

    /** Cache key generator function */
    keyGenerator?: (req: Request) => string

    /** Skip caching if this returns true */
    skip?: (req: Request, res: Response) => boolean
}

export function responseCache(options: ResponseCacheOptions = {}) {
    const opts = {
        ttl: options.ttl || 300000,
        methods: options.methods || ['GET', 'HEAD'],
        statusCodes: options.statusCodes || [200],
        keyGenerator: options.keyGenerator || generateCacheKey,
        skip: options.skip,
    }

    return function (req: Request, res: Response, next: NextFunction): void {
        // Skip if method not cacheable
        if (!opts.methods.includes(req.method)) {
            return next()
        }

        // Skip if skip function returns true
        if (opts.skip && opts.skip(req, res)) {
            return next()
        }

        const cacheKey = opts.keyGenerator(req)

        // Try to get from cache
        const cached = globalCache.get(cacheKey)
        if (cached) {
            res.setHeader('X-Cache', 'HIT')
            res.setHeader('Content-Type', cached.contentType || 'application/json')

            if (cached.headers) {
                for (const [key, value] of Object.entries(cached.headers)) {
                    res.setHeader(key, value)
                }
            }

            return res.status(cached.statusCode).send(cached.body)
        }

        res.setHeader('X-Cache', 'MISS')

        // Capture response
        const originalSend = res.send.bind(res)
        const originalJson = res.json.bind(res)

        const cacheResponse = (body: any) => {
            // Only cache successful responses
            if (opts.statusCodes.includes(res.statusCode)) {
                const contentType = res.getHeader('content-type') as string

                globalCache.set(
                    cacheKey,
                    {
                        statusCode: res.statusCode,
                        body,
                        contentType,
                        headers: res.getHeaders(),
                    },
                    opts.ttl
                )
            }
        }

        res.send = function (body: any): Response {
            cacheResponse(body)
            return originalSend(body)
        } as any

        res.json = function (body: any): Response {
            cacheResponse(body)
            return originalJson(body)
        } as any

        next()
    }
}

/**
 * Function result caching (memoization)
 */
export function memoize<T extends (...args: any[]) => any>(
    fn: T,
    options: { ttl?: number; keyGenerator?: (...args: Parameters<T>) => string } = {}
): T {
    const cache = new LRUCache<ReturnType<T>>({
        ttl: options.ttl || 300000,
        maxSize: 100,
    })

    const keyGen = options.keyGenerator || ((...args: any[]) => JSON.stringify(args))

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = keyGen(...args)
        const cached = cache.get(key)

        if (cached !== undefined) {
            return cached
        }

        const result = fn(...args)

        // Handle promises
        if (result instanceof Promise) {
            return result.then((value: any) => {
                cache.set(key, value)
                return value
            }) as ReturnType<T>
        }

        cache.set(key, result)
        return result
    }) as T
}

/**
 * Cache invalidation patterns
 */
export const CacheInvalidation = {
    /** Invalidate by exact key */
    byKey: (key: string): boolean => {
        return globalCache.delete(key)
    },

    /** Invalidate by pattern (simple string includes) */
    byPattern: (pattern: string): number => {
        let count = 0
        const keys = globalCache.keys()

        for (const key of keys) {
            if (key.includes(pattern)) {
                globalCache.delete(key)
                count++
            }
        }

        return count
    },

    /** Invalidate all */
    all: (): void => {
        globalCache.clear()
    },

    /** Get cache statistics */
    stats: (): CacheStats => {
        return globalCache.getStats()
    },
}

/**
 * Export instances for direct use
 */
export { LRUCache, globalCache }

export default responseCache
