/**
 * Circuit Breaker Pattern
 *
 * Patterns cannibalized from:
 * - opossum (Netflix Hystrix-inspired circuit breaker)
 * - cockatiel (resilience patterns for Node.js)
 * - circuit-breaker-js
 *
 * Zero external dependencies - implemented from scratch
 *
 * Features:
 * - Three states: CLOSED, OPEN, HALF_OPEN
 * - Configurable failure threshold
 * - Automatic state transitions
 * - Request timeout support
 * - Fallback function support
 * - Success/failure tracking
 * - Event emissions for monitoring
 *
 * Usage:
 * const breaker = new CircuitBreaker(myAsyncFunction, {
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 *   timeout: 5000
 * })
 *
 * try {
 *   const result = await breaker.execute(arg1, arg2)
 * } catch (error) {
 *   // Handle error or use fallback
 * }
 */

export enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Rejecting requests
    HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
    /** Number of failures before opening circuit (default: 5) */
    failureThreshold?: number

    /** Time in ms before attempting to close circuit (default: 60000 - 1 minute) */
    resetTimeout?: number

    /** Request timeout in ms (default: 10000 - 10 seconds) */
    timeout?: number

    /** Minimum number of requests before evaluating (default: 10) */
    minimumRequests?: number

    /** Error percentage threshold (0-1, default: 0.5 - 50%) */
    errorThresholdPercentage?: number

    /** Time window for calculating error rate in ms (default: 10000 - 10 seconds) */
    rollingWindow?: number

    /** Name for logging/monitoring (default: 'circuit-breaker') */
    name?: string
}

interface RequestRecord {
    timestamp: number
    success: boolean
}

export class CircuitBreakerError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'CircuitBreakerError'
    }
}

export class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
    private state: CircuitState = CircuitState.CLOSED
    private failureCount: number = 0
    private successCount: number = 0
    private requestRecords: RequestRecord[] = []
    private nextAttempt: number = Date.now()
    private resetTimer?: NodeJS.Timeout

    private readonly fn: T
    private readonly options: Required<CircuitBreakerOptions>

    constructor(fn: T, options: CircuitBreakerOptions = {}) {
        this.fn = fn
        this.options = {
            failureThreshold: options.failureThreshold || 5,
            resetTimeout: options.resetTimeout || 60000,
            timeout: options.timeout || 10000,
            minimumRequests: options.minimumRequests || 10,
            errorThresholdPercentage: options.errorThresholdPercentage || 0.5,
            rollingWindow: options.rollingWindow || 10000,
            name: options.name || 'circuit-breaker',
        }
    }

    async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() < this.nextAttempt) {
                throw new CircuitBreakerError(
                    `Circuit breaker is OPEN for ${this.options.name}. Service unavailable.`
                )
            }
            // Transition to HALF_OPEN to test the service
            this.state = CircuitState.HALF_OPEN
            this.emit('halfOpen')
        }

        try {
            const result = await this.executeWithTimeout(args)
            this.onSuccess()
            return result
        } catch (error) {
            this.onFailure()
            throw error
        }
    }

    private async executeWithTimeout(args: Parameters<T>): Promise<ReturnType<T>> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new CircuitBreakerError(
                    `Request timeout after ${this.options.timeout}ms for ${this.options.name}`
                ))
            }, this.options.timeout)

            this.fn(...args)
                .then((result: any) => {
                    clearTimeout(timeoutId)
                    resolve(result)
                })
                .catch((error: any) => {
                    clearTimeout(timeoutId)
                    reject(error)
                })
        })
    }

    private onSuccess(): void {
        this.successCount++
        this.recordRequest(true)

        if (this.state === CircuitState.HALF_OPEN) {
            // Successful request in HALF_OPEN state - close the circuit
            this.close()
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success
            this.failureCount = Math.max(0, this.failureCount - 1)
        }
    }

    private onFailure(): void {
        this.failureCount++
        this.recordRequest(false)

        if (this.state === CircuitState.HALF_OPEN) {
            // Failed request in HALF_OPEN state - reopen the circuit
            this.open()
        } else if (this.state === CircuitState.CLOSED) {
            // Check if we should open the circuit
            this.checkThresholds()
        }
    }

    private checkThresholds(): void {
        const now = Date.now()
        const windowStart = now - this.options.rollingWindow

        // Filter records within rolling window
        const recentRecords = this.requestRecords.filter(r => r.timestamp >= windowStart)

        if (recentRecords.length < this.options.minimumRequests) {
            // Not enough data to make a decision
            return
        }

        const failures = recentRecords.filter(r => !r.success).length
        const errorRate = failures / recentRecords.length

        // Open circuit if error threshold exceeded
        if (errorRate >= this.options.errorThresholdPercentage) {
            this.open()
        }

        // Also check simple failure count
        if (this.failureCount >= this.options.failureThreshold) {
            this.open()
        }
    }

    private recordRequest(success: boolean): void {
        const now = Date.now()
        this.requestRecords.push({ timestamp: now, success })

        // Cleanup old records (keep only rolling window)
        const windowStart = now - this.options.rollingWindow
        this.requestRecords = this.requestRecords.filter(r => r.timestamp >= windowStart)

        // Limit total records to prevent memory growth (keep last 1000)
        if (this.requestRecords.length > 1000) {
            this.requestRecords = this.requestRecords.slice(-1000)
        }
    }

    private open(): void {
        if (this.state !== CircuitState.OPEN) {
            this.state = CircuitState.OPEN
            this.nextAttempt = Date.now() + this.options.resetTimeout
            this.emit('open')

            // Schedule transition to HALF_OPEN
            if (this.resetTimer) {
                clearTimeout(this.resetTimer)
            }
            this.resetTimer = setTimeout(() => {
                // Note: State will transition to HALF_OPEN on next request
                // This just ensures the timer doesn't block the transition
            }, this.options.resetTimeout)
        }
    }

    private close(): void {
        this.state = CircuitState.CLOSED
        this.failureCount = 0
        this.successCount = 0
        this.emit('close')

        if (this.resetTimer) {
            clearTimeout(this.resetTimer)
            this.resetTimer = undefined
        }
    }

    private emit(event: string): void {
        // Simple event logging - can be extended to proper event emitter
        const stats = this.getStats()
        console.log(`[CircuitBreaker:${this.options.name}] ${event.toUpperCase()} - Stats:`, stats)
    }

    /**
     * Execute with a fallback function if circuit is open
     */
    async executeWithFallback(
        fallback: (...args: Parameters<T>) => Promise<ReturnType<T>> | ReturnType<T>,
        ...args: Parameters<T>
    ): Promise<ReturnType<T>> {
        try {
            return await this.execute(...args)
        } catch (error) {
            if (error instanceof CircuitBreakerError) {
                // Circuit is open, use fallback
                return await fallback(...args)
            }
            throw error
        }
    }

    /**
     * Get current circuit breaker statistics
     */
    getStats() {
        const now = Date.now()
        const windowStart = now - this.options.rollingWindow
        const recentRecords = this.requestRecords.filter(r => r.timestamp >= windowStart)
        const failures = recentRecords.filter(r => !r.success).length
        const successes = recentRecords.filter(r => r.success).length
        const errorRate = recentRecords.length > 0 ? failures / recentRecords.length : 0

        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            recentRequests: recentRecords.length,
            recentFailures: failures,
            recentSuccesses: successes,
            errorRate: Math.round(errorRate * 100) / 100,
            nextAttempt: this.state === CircuitState.OPEN ? this.nextAttempt : null,
        }
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state
    }

    /**
     * Manually reset the circuit breaker
     */
    reset(): void {
        this.close()
        this.requestRecords = []
    }

    /**
     * Check if circuit is allowing requests
     */
    isOpen(): boolean {
        return this.state === CircuitState.OPEN && Date.now() < this.nextAttempt
    }
}

/**
 * Helper function to create a circuit breaker for an async function
 */
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options?: CircuitBreakerOptions
): CircuitBreaker<T> {
    return new CircuitBreaker(fn, options)
}

/**
 * Global circuit breakers registry for common services
 */
class CircuitBreakerRegistry {
    private static instance: CircuitBreakerRegistry
    private breakers: Map<string, CircuitBreaker<any>> = new Map()

    static getInstance(): CircuitBreakerRegistry {
        if (!CircuitBreakerRegistry.instance) {
            CircuitBreakerRegistry.instance = new CircuitBreakerRegistry()
        }
        return CircuitBreakerRegistry.instance
    }

    register<T extends (...args: any[]) => Promise<any>>(
        name: string,
        fn: T,
        options?: CircuitBreakerOptions
    ): CircuitBreaker<T> {
        if (this.breakers.has(name)) {
            return this.breakers.get(name)!
        }

        const breaker = new CircuitBreaker(fn, { ...options, name })
        this.breakers.set(name, breaker)
        return breaker
    }

    get(name: string): CircuitBreaker<any> | undefined {
        return this.breakers.get(name)
    }

    getAllStats(): Record<string, ReturnType<CircuitBreaker<any>['getStats']>> {
        const stats: Record<string, any> = {}
        for (const [name, breaker] of this.breakers.entries()) {
            stats[name] = breaker.getStats()
        }
        return stats
    }

    reset(name?: string): void {
        if (name) {
            this.breakers.get(name)?.reset()
        } else {
            for (const breaker of this.breakers.values()) {
                breaker.reset()
            }
        }
    }
}

export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance()

export default CircuitBreaker
