/**
 * Response Compression Middleware
 * Cannibalized from compression and shrink-ray-current patterns
 * Implements gzip/brotli compression for responses
 */

import { Request, Response, NextFunction } from 'express'
import * as zlib from 'zlib'
import Logger from '../utils/Logger'

interface CompressionOptions {
    threshold?: number // Minimum size in bytes to compress (default 1024)
    level?: number // Compression level 0-9 (default 6)
    filter?: (req: Request, res: Response) => boolean
}

/**
 * Check if response should be compressed
 */
function shouldCompress(
    req: Request,
    res: Response,
    threshold: number,
    filter?: (req: Request, res: Response) => boolean
): boolean {
    // Custom filter override
    if (filter && !filter(req, res)) {
        return false
    }

    // Check if client accepts compression
    const acceptEncoding = req.headers['accept-encoding'] as string || ''
    if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
        return false
    }

    // Don't compress if already compressed
    if (res.getHeader('Content-Encoding')) {
        return false
    }

    // Check content type
    const contentType = res.getHeader('Content-Type') as string || ''

    // Compressible types
    const compressibleTypes = [
        'text/',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/x-www-form-urlencoded',
    ]

    const isCompressible = compressibleTypes.some(type => contentType.includes(type))
    if (!isCompressible) {
        return false
    }

    // Check content length
    const contentLength = res.getHeader('Content-Length')
    if (contentLength && Number(contentLength) < threshold) {
        return false
    }

    return true
}

/**
 * Compression middleware
 * Automatically compresses responses using gzip
 */
export function compressionMiddleware(options: CompressionOptions = {}) {
    const threshold = options.threshold || 1024 // 1KB default
    const level = options.level !== undefined ? options.level : 6 // Default compression level
    const filter = options.filter

    return (req: Request, res: Response, next: NextFunction) => {
        // Store original methods
        const originalWrite = res.write
        const originalEnd = res.end

        let chunks: Buffer[] = []
        let shouldCompressResponse = false

        // Override write method
        res.write = function (chunk: any, encoding?: any, callback?: any): boolean {
            // Collect chunks
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
            }

            // Handle callback
            if (typeof encoding === 'function') {
                callback = encoding
                encoding = undefined
            }

            if (callback) {
                callback()
            }

            return true
        }

        // Override end method
        res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
            // Add final chunk
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, encoding))
            }

            // Handle callback
            if (typeof encoding === 'function') {
                callback = encoding
                encoding = undefined
            }

            // Combine all chunks
            const buffer = Buffer.concat(chunks)

            // Determine if we should compress
            res.setHeader('Content-Length', buffer.length)
            shouldCompressResponse = shouldCompress(req, res, threshold, filter)

            if (shouldCompressResponse && buffer.length > 0) {
                // Compress with gzip
                zlib.gzip(buffer, { level }, (err, compressed) => {
                    if (err) {
                        Logger.e(`Compression error: ${err.message}`)
                        // Send uncompressed on error
                        res.setHeader('Content-Length', buffer.length)
                        originalEnd.call(res, buffer, encoding, callback)
                        return
                    }

                    // Send compressed
                    res.setHeader('Content-Encoding', 'gzip')
                    res.setHeader('Content-Length', compressed.length)
                    res.removeHeader('Content-Length') // Let it be calculated

                    originalEnd.call(res, compressed, encoding, callback)
                })
            } else {
                // Send uncompressed
                originalEnd.call(res, buffer, encoding, callback)
            }

            return res
        }

        next()
    }
}

/**
 * Simple compression middleware (always on for compressible content)
 */
export function simpleCompression() {
    return compressionMiddleware({
        threshold: 1024,
        level: 6,
    })
}

export default compressionMiddleware
