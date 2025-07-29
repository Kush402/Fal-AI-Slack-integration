/**
 * @fileoverview Error Handler Utility - Centralized error handling and response formatting
 * @description This utility provides consistent error handling patterns, error classification,
 * and standardized error responses across the application.
 */

const logger = require('./logger');

class ErrorHandler {
    constructor() {
        this.errorTypes = {
            VALIDATION_ERROR: 'VALIDATION_ERROR',
            AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
            AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
            RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
            TIMEOUT_ERROR: 'TIMEOUT_ERROR',
            SERVICE_ERROR: 'SERVICE_ERROR',
            NETWORK_ERROR: 'NETWORK_ERROR',
            RESOURCE_ERROR: 'RESOURCE_ERROR',
            CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
            UNKNOWN_ERROR: 'UNKNOWN_ERROR'
        };
    }

    /**
     * Classify error based on type and properties
     * @param {Error} error - Error object
     * @returns {string} Error type
     */
    classifyError(error) {
        if (!error) return this.errorTypes.UNKNOWN_ERROR;

        // Check for specific error codes
        if (error.code) {
            switch (error.code) {
                case 'VALIDATION_ERROR':
                case 'INVALID_INPUT':
                    return this.errorTypes.VALIDATION_ERROR;
                case 'AUTH_ERROR':
                case 'UNAUTHORIZED':
                    return this.errorTypes.AUTHENTICATION_ERROR;
                case 'FORBIDDEN':
                case 'INSUFFICIENT_PERMISSIONS':
                    return this.errorTypes.AUTHORIZATION_ERROR;
                case 'RATE_LIMIT_EXCEEDED':
                case 'TOO_MANY_REQUESTS':
                    return this.errorTypes.RATE_LIMIT_ERROR;
                case 'TIMEOUT':
                case 'REQUEST_TIMEOUT':
                    return this.errorTypes.TIMEOUT_ERROR;
                case 'SERVICE_UNAVAILABLE':
                case 'API_ERROR':
                    return this.errorTypes.SERVICE_ERROR;
                case 'NETWORK_ERROR':
                case 'ECONNREFUSED':
                case 'ENOTFOUND':
                    return this.errorTypes.NETWORK_ERROR;
                case 'RESOURCE_NOT_FOUND':
                case 'NOT_FOUND':
                    return this.errorTypes.RESOURCE_ERROR;
                case 'CONFIG_ERROR':
                case 'MISSING_CONFIG':
                    return this.errorTypes.CONFIGURATION_ERROR;
            }
        }

        // Check error message patterns
        const message = error.message?.toLowerCase() || '';
        if (message.includes('validation') || message.includes('invalid')) {
            return this.errorTypes.VALIDATION_ERROR;
        }
        if (message.includes('auth') || message.includes('unauthorized')) {
            return this.errorTypes.AUTHENTICATION_ERROR;
        }
        if (message.includes('forbidden') || message.includes('permission')) {
            return this.errorTypes.AUTHORIZATION_ERROR;
        }
        if (message.includes('rate limit') || message.includes('too many')) {
            return this.errorTypes.RATE_LIMIT_ERROR;
        }
        if (message.includes('timeout') || message.includes('timed out')) {
            return this.errorTypes.TIMEOUT_ERROR;
        }
        if (message.includes('service') || message.includes('api')) {
            return this.errorTypes.SERVICE_ERROR;
        }
        if (message.includes('network') || message.includes('connection')) {
            return this.errorTypes.NETWORK_ERROR;
        }
        if (message.includes('not found') || message.includes('missing')) {
            return this.errorTypes.RESOURCE_ERROR;
        }
        if (message.includes('config') || message.includes('configuration')) {
            return this.errorTypes.CONFIGURATION_ERROR;
        }

        return this.errorTypes.UNKNOWN_ERROR;
    }

    /**
     * Get HTTP status code for error type
     * @param {string} errorType - Error type
     * @returns {number} HTTP status code
     */
    getStatusCode(errorType) {
        const statusCodes = {
            [this.errorTypes.VALIDATION_ERROR]: 400,
            [this.errorTypes.AUTHENTICATION_ERROR]: 401,
            [this.errorTypes.AUTHORIZATION_ERROR]: 403,
            [this.errorTypes.RATE_LIMIT_ERROR]: 429,
            [this.errorTypes.TIMEOUT_ERROR]: 408,
            [this.errorTypes.SERVICE_ERROR]: 503,
            [this.errorTypes.NETWORK_ERROR]: 502,
            [this.errorTypes.RESOURCE_ERROR]: 404,
            [this.errorTypes.CONFIGURATION_ERROR]: 500,
            [this.errorTypes.UNKNOWN_ERROR]: 500
        };

        return statusCodes[errorType] || 500;
    }

    /**
     * Format error response
     * @param {Error} error - Error object
     * @param {Object} options - Additional options
     * @returns {Object} Formatted error response
     */
    formatErrorResponse(error, options = {}) {
        const errorType = this.classifyError(error);
        const statusCode = this.getStatusCode(errorType);
        const { requestId, userId, sessionId, serviceName } = options;

        const response = {
            success: false,
            error: {
                type: errorType,
                message: error.message || 'An unexpected error occurred',
                code: error.code || 'UNKNOWN_ERROR',
                statusCode
            },
            timestamp: new Date().toISOString(),
            requestId: requestId || error.requestId,
            ...(userId && { userId }),
            ...(sessionId && { sessionId }),
            ...(serviceName && { serviceName })
        };

        // Add additional context for development
        if (process.env.NODE_ENV === 'development') {
            response.error.stack = error.stack;
            response.error.details = error.details || {};
        }

        return response;
    }

    /**
     * Log error with context
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     */
    logError(error, context = {}) {
        const errorType = this.classifyError(error);
        const { userId, sessionId, serviceName, operation } = context;

        const logData = {
            errorType,
            message: error.message,
            code: error.code,
            stack: error.stack,
            ...context
        };

        // Use appropriate log level based on error type
        switch (errorType) {
            case this.errorTypes.VALIDATION_ERROR:
                logger.warn('Validation error', logData);
                break;
            case this.errorTypes.RATE_LIMIT_ERROR:
                logger.warn('Rate limit exceeded', logData);
                break;
            case this.errorTypes.TIMEOUT_ERROR:
                logger.warn('Request timeout', logData);
                break;
            case this.errorTypes.SERVICE_ERROR:
            case this.errorTypes.NETWORK_ERROR:
                logger.error('Service error', logData);
                break;
            case this.errorTypes.CONFIGURATION_ERROR:
                logger.error('Configuration error', logData);
                break;
            default:
                logger.error('Unexpected error', logData);
        }
    }

    /**
     * Handle async errors in route handlers
     * @param {Function} fn - Async function to wrap
     * @returns {Function} Wrapped function with error handling
     */
    asyncHandler(fn) {
        return async (req, res, next) => {
            try {
                await fn(req, res, next);
            } catch (error) {
                this.handleRouteError(error, req, res);
            }
        };
    }

    /**
     * Handle route errors
     * @param {Error} error - Error object
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    handleRouteError(error, req, res) {
        const context = {
            userId: req.body?.userId || req.params?.userId,
            sessionId: req.body?.sessionId,
            serviceName: req.path?.split('/')[2], // Extract service name from path
            operation: req.method,
            requestId: req.id,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        };

        this.logError(error, context);

        const response = this.formatErrorResponse(error, {
            requestId: req.id,
            userId: context.userId,
            sessionId: context.sessionId,
            serviceName: context.serviceName
        });

        const statusCode = response.error.statusCode;
        res.status(statusCode).json(response);
    }

    /**
     * Create custom error with type
     * @param {string} message - Error message
     * @param {string} type - Error type
     * @param {Object} details - Additional details
     * @returns {Error} Custom error
     */
    createError(message, type = this.errorTypes.UNKNOWN_ERROR, details = {}) {
        const error = new Error(message);
        error.code = type;
        error.details = details;
        return error;
    }

    /**
     * Validate error response format
     * @param {Object} response - Error response to validate
     * @returns {boolean} Whether response is valid
     */
    validateErrorResponse(response) {
        return response && 
               typeof response === 'object' &&
               response.success === false &&
               response.error &&
               typeof response.error.message === 'string' &&
               typeof response.error.type === 'string';
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStats() {
        // This would typically integrate with a metrics system
        return {
            totalErrors: 0,
            errorTypes: {},
            lastError: null
        };
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

module.exports = {
    ErrorHandler,
    errorHandler
}; 