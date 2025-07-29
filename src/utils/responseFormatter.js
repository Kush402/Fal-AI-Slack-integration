/**
 * @fileoverview Centralized Response Formatter
 * @description Provides standardized response formatting for all services
 */

const logger = require('./logger');

class ResponseFormatter {
    /**
     * Create a standardized success response
     * @param {Object} data - Response data
     * @param {Object} options - Response options
     * @returns {Object} Formatted success response
     */
    static success(data = null, options = {}) {
        const {
            message = 'Operation completed successfully',
            code = 'SUCCESS',
            metadata = {},
            timestamp = new Date().toISOString()
        } = options;

        const response = {
            success: true,
            message,
            code,
            data,
            metadata: {
                timestamp,
                ...metadata
            }
        };

        // Add request ID if provided
        if (options.requestId) {
            response.metadata.requestId = options.requestId;
        }

        // Add job ID if provided
        if (options.jobId) {
            response.metadata.jobId = options.jobId;
        }

        // Add session info if provided
        if (options.sessionId) {
            response.metadata.sessionId = options.sessionId;
        }

        return response;
    }

    /**
     * Create a standardized error response
     * @param {Error|string} error - Error object or message
     * @param {Object} options - Response options
     * @returns {Object} Formatted error response
     */
    static error(error, options = {}) {
        const {
            code = 'ERROR',
            statusCode = 500,
            metadata = {},
            timestamp = new Date().toISOString()
        } = options;

        // Extract error information
        const errorMessage = error instanceof Error ? error.message : error;
        const errorCode = error instanceof Error && error.code ? error.code : code;
        const errorStack = error instanceof Error ? error.stack : undefined;

        const response = {
            success: false,
            error: errorMessage,
            code: errorCode,
            statusCode,
            metadata: {
                timestamp,
                ...metadata
            }
        };

        // Add stack trace in development
        if (process.env.NODE_ENV === 'development' && errorStack) {
            response.metadata.stack = errorStack;
        }

        // Add request ID if provided
        if (options.requestId) {
            response.metadata.requestId = options.requestId;
        }

        // Add job ID if provided
        if (options.jobId) {
            response.metadata.jobId = options.jobId;
        }

        // Add session info if provided
        if (options.sessionId) {
            response.metadata.sessionId = options.sessionId;
        }

        // Add original error for debugging
        if (error instanceof Error) {
            response.metadata.originalError = {
                name: error.name,
                message: error.message,
                code: error.code
            };
        }

        return response;
    }

    /**
     * Create a standardized validation error response
     * @param {Array} errors - Validation errors
     * @param {Array} warnings - Validation warnings
     * @param {Object} options - Response options
     * @returns {Object} Formatted validation error response
     */
    static validationError(errors = [], warnings = [], options = {}) {
        const {
            message = 'Validation failed',
            code = 'VALIDATION_ERROR',
            statusCode = 400,
            metadata = {},
            timestamp = new Date().toISOString()
        } = options;

        const response = {
            success: false,
            error: message,
            code,
            statusCode,
            validation: {
                errors,
                warnings
            },
            metadata: {
                timestamp,
                ...metadata
            }
        };

        // Add request ID if provided
        if (options.requestId) {
            response.metadata.requestId = options.requestId;
        }

        return response;
    }

    /**
     * Create a standardized paginated response
     * @param {Array} data - Response data array
     * @param {Object} pagination - Pagination information
     * @param {Object} options - Response options
     * @returns {Object} Formatted paginated response
     */
    static paginated(data = [], pagination = {}, options = {}) {
        const {
            message = 'Data retrieved successfully',
            code = 'SUCCESS',
            metadata = {},
            timestamp = new Date().toISOString()
        } = options;

        const response = {
            success: true,
            message,
            code,
            data,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 10,
                total: pagination.total || data.length,
                pages: pagination.pages || Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
                hasNext: pagination.hasNext || false,
                hasPrev: pagination.hasPrev || false
            },
            metadata: {
                timestamp,
                ...metadata
            }
        };

        // Add request ID if provided
        if (options.requestId) {
            response.metadata.requestId = options.requestId;
        }

        return response;
    }

    /**
     * Create a standardized service status response
     * @param {string} serviceName - Name of the service
     * @param {Object} status - Service status information
     * @param {Object} options - Response options
     * @returns {Object} Formatted status response
     */
    static serviceStatus(serviceName, status = {}, options = {}) {
        const {
            message = 'Service status retrieved',
            code = 'SUCCESS',
            metadata = {},
            timestamp = new Date().toISOString()
        } = options;

        const response = {
            success: true,
            message,
            code,
            service: serviceName,
            status: {
                operational: status.operational !== false,
                uptime: status.uptime || process.uptime(),
                version: status.version || '1.0.0',
                lastCheck: timestamp,
                ...status
            },
            metadata: {
                timestamp,
                ...metadata
            }
        };

        return response;
    }

    /**
     * Create a standardized health check response
     * @param {Object} health - Health check information
     * @param {Object} options - Response options
     * @returns {Object} Formatted health response
     */
    static healthCheck(health = {}, options = {}) {
        const {
            message = 'Health check completed',
            code = 'SUCCESS',
            metadata = {},
            timestamp = new Date().toISOString()
        } = options;

        const response = {
            success: true,
            message,
            code,
            health: {
                status: health.status || 'healthy',
                timestamp,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                ...health
            },
            metadata: {
                timestamp,
                ...metadata
            }
        };

        return response;
    }

    /**
     * Create a standardized asset generation response
     * @param {Array} assets - Generated assets
     * @param {Object} generationInfo - Generation information
     * @param {Object} options - Response options
     * @returns {Object} Formatted asset response
     */
    static assetGeneration(assets = [], generationInfo = {}, options = {}) {
        const {
            message = 'Assets generated successfully',
            code = 'SUCCESS',
            metadata = {},
            timestamp = new Date().toISOString()
        } = options;

        const response = {
            success: true,
            message,
            code,
            assets: assets.map((asset, index) => ({
                id: asset.id || `asset_${index + 1}`,
                url: asset.url,
                type: asset.type || 'unknown',
                format: asset.format || 'unknown',
                size: asset.size,
                index: asset.index || index,
                metadata: asset.metadata || {}
            })),
            generation: {
                model: generationInfo.model,
                prompt: generationInfo.prompt,
                parameters: generationInfo.parameters || {},
                duration: generationInfo.duration,
                cost: generationInfo.cost,
                ...generationInfo
            },
            metadata: {
                timestamp,
                assetCount: assets.length,
                ...metadata
            }
        };

        // Add request ID if provided
        if (options.requestId) {
            response.metadata.requestId = options.requestId;
        }

        // Add job ID if provided
        if (options.jobId) {
            response.metadata.jobId = options.jobId;
        }

        // Add session info if provided
        if (options.sessionId) {
            response.metadata.sessionId = options.sessionId;
        }

        return response;
    }

    /**
     * Create a standardized model list response
     * @param {Array} models - Available models
     * @param {Object} options - Response options
     * @returns {Object} Formatted model list response
     */
    static modelList(models = [], options = {}) {
        const {
            message = 'Models retrieved successfully',
            code = 'SUCCESS',
            metadata = {},
            timestamp = new Date().toISOString()
        } = options;

        const response = {
            success: true,
            message,
            code,
            models: models.map(model => ({
                id: model.id,
                name: model.name,
                description: model.description,
                type: model.type || 'unknown',
                capabilities: model.capabilities || [],
                parameters: model.parameters || {},
                ...model
            })),
            metadata: {
                timestamp,
                modelCount: models.length,
                ...metadata
            }
        };

        return response;
    }

    /**
     * Log response for debugging
     * @param {Object} response - Response object to log
     * @param {string} context - Context for logging
     */
    static logResponse(response, context = 'response') {
        if (response.success) {
            logger.debug(`${context} success`, {
                code: response.code,
                dataType: response.data ? typeof response.data : 'null',
                timestamp: response.metadata?.timestamp
            });
        } else {
            logger.warn(`${context} error`, {
                code: response.code,
                error: response.error,
                statusCode: response.statusCode
            });
        }
    }

    /**
     * Sanitize response for external consumption
     * @param {Object} response - Response to sanitize
     * @param {Object} options - Sanitization options
     * @returns {Object} Sanitized response
     */
    static sanitizeResponse(response, options = {}) {
        const {
            removeInternalFields = true,
            removeStackTraces = true,
            removeSensitiveData = true
        } = options;

        const sanitized = { ...response };

        if (removeInternalFields) {
            delete sanitized.metadata?.stack;
            delete sanitized.metadata?.originalError;
        }

        if (removeStackTraces) {
            delete sanitized.metadata?.stack;
        }

        if (removeSensitiveData) {
            delete sanitized.metadata?.apiKey;
            delete sanitized.metadata?.token;
            delete sanitized.metadata?.password;
        }

        return sanitized;
    }
}

module.exports = ResponseFormatter; 