/**
 * Audit Logging Middleware
 * Cannibalized from audit-log and security logging patterns
 * Tracks sensitive operations for compliance and security
 */

import { Request, Response, NextFunction } from 'express'
import Logger from '../utils/Logger'
import * as crypto from 'crypto'

interface AuditEvent {
    timestamp: string
    eventId: string
    requestId?: string
    userId?: string
    action: string
    resource: string
    resourceId?: string
    method: string
    path: string
    ip: string
    userAgent?: string
    statusCode?: number
    changes?: any
    success: boolean
    errorMessage?: string
}

class AuditLogger {
    private static events: AuditEvent[] = []
    private static maxEvents = 10000 // Keep last 10k events in memory

    /**
     * Log an audit event
     */
    static log(event: Omit<AuditEvent, 'timestamp' | 'eventId'>): void {
        const auditEvent: AuditEvent = {
            timestamp: new Date().toISOString(),
            eventId: crypto.randomBytes(8).toString('hex'),
            ...event,
        }

        // Add to in-memory store
        this.events.push(auditEvent)

        // Trim if too large
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents)
        }

        // Log to console
        const logMessage = `AUDIT: ${event.action} ${event.resource}${event.resourceId ? '/' + event.resourceId : ''} by ${event.userId || 'anonymous'} from ${event.ip} - ${event.success ? 'SUCCESS' : 'FAILED'}`

        if (event.success) {
            Logger.d(logMessage)
        } else {
            Logger.w(logMessage + (event.errorMessage ? `: ${event.errorMessage}` : ''))
        }
    }

    /**
     * Get recent audit events
     */
    static getEvents(limit: number = 100): AuditEvent[] {
        return this.events.slice(-limit).reverse()
    }

    /**
     * Get events for a specific user
     */
    static getEventsByUser(userId: string, limit: number = 100): AuditEvent[] {
        return this.events
            .filter(e => e.userId === userId)
            .slice(-limit)
            .reverse()
    }

    /**
     * Get events for a specific resource
     */
    static getEventsByResource(resource: string, resourceId?: string, limit: number = 100): AuditEvent[] {
        return this.events
            .filter(e => e.resource === resource && (!resourceId || e.resourceId === resourceId))
            .slice(-limit)
            .reverse()
    }
}

/**
 * Middleware to audit sensitive operations
 */
export function auditMiddleware(options: {
    action: string
    resource: string
    extractResourceId?: (req: Request) => string | undefined
    extractChanges?: (req: Request) => any
}) {
    return (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now()

        // Extract info
        const resourceId = options.extractResourceId ? options.extractResourceId(req) : undefined
        const changes = options.extractChanges ? options.extractChanges(req) : undefined

        // Intercept response to log after completion
        const originalSend = res.send
        res.send = function (data: any) {
            const duration = Date.now() - startTime

            // Determine success
            const success = res.statusCode >= 200 && res.statusCode < 400
            const errorMessage = !success && data && data.description ? data.description : undefined

            // Log audit event
            AuditLogger.log({
                requestId: req.id,
                userId: (req as any).user?.id || undefined, // Would come from auth
                action: options.action,
                resource: options.resource,
                resourceId,
                method: req.method,
                path: req.path,
                ip: (req.headers['x-real-ip'] as string) ||
                    (req.headers['x-forwarded-for'] as string) ||
                    req.ip ||
                    'unknown',
                userAgent: req.headers['user-agent'] as string,
                statusCode: res.statusCode,
                changes,
                success,
                errorMessage,
            })

            return originalSend.call(res, data)
        }

        next()
    }
}

/**
 * Audit specific operations
 */
export const AuditOperations = {
    appCreate: () => auditMiddleware({
        action: 'CREATE',
        resource: 'app',
        extractResourceId: (req) => req.body.appName,
        extractChanges: (req) => ({
            hasPersistentData: req.body.hasPersistentData,
            projectId: req.body.projectId,
        }),
    }),

    appUpdate: () => auditMiddleware({
        action: 'UPDATE',
        resource: 'app',
        extractResourceId: (req) => req.body.appName,
        extractChanges: (req) => ({
            instanceCount: req.body.instanceCount,
            envVarsCount: req.body.envVars?.length,
            volumesCount: req.body.volumes?.length,
            portsCount: req.body.ports?.length,
        }),
    }),

    appDelete: () => auditMiddleware({
        action: 'DELETE',
        resource: 'app',
        extractResourceId: (req) => req.body.appName,
        extractChanges: (req) => ({
            volumes: req.body.volumes,
        }),
    }),

    appDeploy: () => auditMiddleware({
        action: 'DEPLOY',
        resource: 'app',
        extractResourceId: (req) => req.params.appName,
        extractChanges: (req) => ({
            hasSourceFile: !!req.file,
            hasCaptainDefinition: !!req.body.captainDefinitionContent,
            gitHash: req.body.gitHash,
        }),
    }),

    sslEnable: () => auditMiddleware({
        action: 'SSL_ENABLE',
        resource: 'app',
        extractResourceId: (req) => req.body.appName,
        extractChanges: (req) => ({
            customDomain: req.body.customDomain,
        }),
    }),

    domainAdd: () => auditMiddleware({
        action: 'DOMAIN_ADD',
        resource: 'app',
        extractResourceId: (req) => req.body.appName,
        extractChanges: (req) => ({
            customDomain: req.body.customDomain,
        }),
    }),

    domainRemove: () => auditMiddleware({
        action: 'DOMAIN_REMOVE',
        resource: 'app',
        extractResourceId: (req) => req.body.appName,
        extractChanges: (req) => ({
            customDomain: req.body.customDomain,
        }),
    }),

    login: () => auditMiddleware({
        action: 'LOGIN',
        resource: 'auth',
        extractChanges: (req) => ({
            hasOtp: !!req.body.otpToken,
        }),
    }),
}

export { AuditLogger }
export default auditMiddleware
