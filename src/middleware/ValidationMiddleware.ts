/**
 * Validation Middleware
 * Cannibalized from express-validator and joi patterns
 * Provides reusable validation functions for common inputs
 */

import { Request, Response, NextFunction } from 'express'
import ApiStatusCodes from '../api/ApiStatusCodes'
import BaseApi from '../api/BaseApi'

/**
 * Validation result
 */
interface ValidationResult {
    isValid: boolean
    errors: string[]
}

/**
 * Validation functions
 */
export const Validators = {
    /**
     * Validate app name format
     */
    appName(value: any): ValidationResult {
        const errors: string[] = []

        if (!value || typeof value !== 'string') {
            errors.push('App name must be a string')
        } else {
            const trimmed = value.trim()

            if (trimmed.length === 0) {
                errors.push('App name cannot be empty')
            }

            if (trimmed.length > 64) {
                errors.push('App name cannot exceed 64 characters')
            }

            if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
                errors.push('App name can only contain letters, numbers, dashes, and underscores')
            }

            // Additional security checks
            if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
                errors.push('App name cannot contain path traversal characters')
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    },

    /**
     * Validate instance count
     */
    instanceCount(value: any): ValidationResult {
        const errors: string[] = []

        const num = Number(value)

        if (isNaN(num)) {
            errors.push('Instance count must be a number')
        } else if (num < 0) {
            errors.push('Instance count cannot be negative')
        } else if (num > 100) {
            errors.push('Instance count cannot exceed 100')
        } else if (!Number.isInteger(num)) {
            errors.push('Instance count must be an integer')
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    },

    /**
     * Validate environment variables array
     */
    envVars(value: any): ValidationResult {
        const errors: string[] = []

        if (!Array.isArray(value)) {
            errors.push('Environment variables must be an array')
            return { isValid: false, errors }
        }

        value.forEach((envVar, index) => {
            if (!envVar || typeof envVar !== 'object') {
                errors.push(`Environment variable at index ${index} must be an object`)
            } else {
                if (!envVar.key || typeof envVar.key !== 'string') {
                    errors.push(`Environment variable at index ${index} must have a 'key' property (string)`)
                }
                if (envVar.value === undefined || envVar.value === null) {
                    errors.push(`Environment variable at index ${index} must have a 'value' property`)
                }
                // Check for common mistakes
                if (envVar.name && !envVar.key) {
                    errors.push(`Environment variable at index ${index} uses 'name' instead of 'key'`)
                }
            }
        })

        return {
            isValid: errors.length === 0,
            errors,
        }
    },

    /**
     * Validate domain name
     */
    domain(value: any): ValidationResult {
        const errors: string[] = []

        if (!value || typeof value !== 'string') {
            errors.push('Domain must be a string')
        } else {
            const trimmed = value.trim().toLowerCase()

            if (trimmed.length === 0) {
                errors.push('Domain cannot be empty')
            }

            // Basic domain regex (not RFC-compliant but good enough)
            const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
            if (!domainRegex.test(trimmed)) {
                errors.push('Invalid domain format')
            }

            if (trimmed.length > 253) {
                errors.push('Domain name too long (max 253 characters)')
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    },

    /**
     * Validate email address
     */
    email(value: any): ValidationResult {
        const errors: string[] = []

        if (!value || typeof value !== 'string') {
            errors.push('Email must be a string')
        } else {
            // Simple email regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(value)) {
                errors.push('Invalid email format')
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    },

    /**
     * Validate port number
     */
    port(value: any): ValidationResult {
        const errors: string[] = []

        const num = Number(value)

        if (isNaN(num)) {
            errors.push('Port must be a number')
        } else if (num < 1 || num > 65535) {
            errors.push('Port must be between 1 and 65535')
        } else if (!Number.isInteger(num)) {
            errors.push('Port must be an integer')
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    },

    /**
     * Validate non-empty string
     */
    nonEmptyString(value: any, fieldName: string = 'Field'): ValidationResult {
        const errors: string[] = []

        if (!value || typeof value !== 'string') {
            errors.push(`${fieldName} must be a string`)
        } else if (value.trim().length === 0) {
            errors.push(`${fieldName} cannot be empty`)
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    },
}

/**
 * Create validation middleware for a specific field
 */
export function validateField(
    field: string,
    validator: (value: any) => ValidationResult,
    location: 'body' | 'params' | 'query' = 'body'
) {
    return (req: Request, res: Response, next: NextFunction) => {
        const value = location === 'body' ? req.body[field] :
                     location === 'params' ? req.params[field] :
                     req.query[field]

        const result = validator(value)

        if (!result.isValid) {
            res.send(
                new BaseApi(
                    ApiStatusCodes.ILLEGAL_PARAMETER,
                    result.errors.join('; ')
                )
            )
            return
        }

        next()
    }
}

/**
 * Create validation middleware for multiple fields
 */
export function validateFields(
    validations: Array<{
        field: string
        validator: (value: any) => ValidationResult
        location?: 'body' | 'params' | 'query'
    }>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        const allErrors: string[] = []

        for (const validation of validations) {
            const location = validation.location || 'body'
            const value = location === 'body' ? req.body[validation.field] :
                         location === 'params' ? req.params[validation.field] :
                         req.query[validation.field]

            const result = validation.validator(value)

            if (!result.isValid) {
                allErrors.push(...result.errors)
            }
        }

        if (allErrors.length > 0) {
            res.send(
                new BaseApi(
                    ApiStatusCodes.ILLEGAL_PARAMETER,
                    allErrors.join('; ')
                )
            )
            return
        }

        next()
    }
}

export default Validators
