/**
 * Graceful Shutdown Handler
 * Cannibalized from terminus and lightship patterns
 * Ensures clean shutdown of HTTP server and cleanup of resources
 */

import * as http from 'http'
import Logger from '../utils/Logger'

interface ShutdownHandler {
    name: string
    handler: () => Promise<void>
}

class GracefulShutdown {
    private server: http.Server | null = null
    private shutdownHandlers: ShutdownHandler[] = []
    private isShuttingDown = false
    private shutdownTimeout = 30000 // 30 seconds default

    /**
     * Initialize graceful shutdown for server
     */
    init(server: http.Server, timeout: number = 30000) {
        this.server = server
        this.shutdownTimeout = timeout

        // Register signal handlers
        process.on('SIGTERM', () => this.shutdown('SIGTERM'))
        process.on('SIGINT', () => this.shutdown('SIGINT'))

        // Handle uncaught errors
        process.on('uncaughtException', (err) => {
            Logger.e(`Uncaught Exception: ${err.message}`)
            Logger.e(err.stack || '')
            this.shutdown('uncaughtException')
        })

        process.on('unhandledRejection', (reason, promise) => {
            Logger.e(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
            this.shutdown('unhandledRejection')
        })

        Logger.d('Graceful shutdown handlers registered')
    }

    /**
     * Register a cleanup handler
     */
    onShutdown(name: string, handler: () => Promise<void>) {
        this.shutdownHandlers.push({ name, handler })
        Logger.d(`Registered shutdown handler: ${name}`)
    }

    /**
     * Perform graceful shutdown
     */
    private async shutdown(signal: string) {
        if (this.isShuttingDown) {
            Logger.w('Shutdown already in progress, ignoring signal')
            return
        }

        this.isShuttingDown = true
        Logger.d(`Received ${signal}, starting graceful shutdown...`)

        // Set timeout for forced shutdown
        const forceTimeout = setTimeout(() => {
            Logger.e(`Graceful shutdown timeout (${this.shutdownTimeout}ms), forcing exit`)
            process.exit(1)
        }, this.shutdownTimeout)

        try {
            // Stop accepting new connections
            if (this.server) {
                Logger.d('Closing HTTP server...')
                await new Promise<void>((resolve, reject) => {
                    this.server!.close((err) => {
                        if (err) {
                            Logger.e(`Error closing server: ${err.message}`)
                            reject(err)
                        } else {
                            Logger.d('HTTP server closed')
                            resolve()
                        }
                    })
                })
            }

            // Run cleanup handlers
            Logger.d(`Running ${this.shutdownHandlers.length} cleanup handlers...`)
            for (const handler of this.shutdownHandlers) {
                try {
                    Logger.d(`Running cleanup: ${handler.name}`)
                    await handler.handler()
                    Logger.d(`Cleanup completed: ${handler.name}`)
                } catch (err: any) {
                    Logger.e(`Error in cleanup handler ${handler.name}: ${err.message}`)
                }
            }

            clearTimeout(forceTimeout)
            Logger.d('Graceful shutdown completed successfully')
            process.exit(0)
        } catch (err: any) {
            clearTimeout(forceTimeout)
            Logger.e(`Error during graceful shutdown: ${err.message}`)
            process.exit(1)
        }
    }

    /**
     * Check if shutdown is in progress
     */
    isShuttingDownNow(): boolean {
        return this.isShuttingDown
    }
}

// Singleton instance
const gracefulShutdown = new GracefulShutdown()

export default gracefulShutdown
