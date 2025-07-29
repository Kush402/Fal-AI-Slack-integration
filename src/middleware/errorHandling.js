const logger = require('../utils/logger');
const config = require('../config');

/**
 * Secure error handling middleware
 * Sanitizes error messages and prevents sensitive data exposure in production
 */

/**
 * List of sensitive keywords that should not appear in error messages
 */
const SENSITIVE_KEYWORDS = [
    'password', 'secret', 'token', 'key', 'api_key', 'credential',
    'authorization', 'session', 'cookie', 'jwt', 'bearer',
    'database', 'mongodb', 'redis', 'sql', 'connection_string',
    'env', 'environment', 'config', 'private'
];

/**
 * Sanitize error message to remove sensitive information
 */
function sanitizeErrorMessage(message) {
    if (!message || typeof message !== 'string') {
        return 'An error occurred';
    }

    let sanitized = message;
    
    // Remove sensitive keywords and their values
    SENSITIVE_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(`${keyword}[\\s]*[:=][\\s]*[^\\s]+`, 'gi');
        sanitized = sanitized.replace(regex, `${keyword}: [REDACTED]`);
    });
    
    // Remove file paths that might contain sensitive information
    sanitized = sanitized.replace(/\/[^\s]*\/[^\s]*/g, '[FILE_PATH]');
    
    // Remove URLs with credentials
    sanitized = sanitized.replace(/https?:\/\/[^@\s]+@[^\s]+/g, '[REDACTED_URL]');
    
    // Remove IP addresses
    sanitized = sanitized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]');
    
    // Remove potential API keys (long alphanumeric strings)
    sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED_KEY]');
    
    // Limit message length to prevent information leakage
    if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200) + '...';
    }
    
    return sanitized;
}

/**
 * Create safe error response for different error types
 */
function createSafeErrorResponse(error, req) {
    const isDevelopment = config.env === 'development';
    const correlationId = req.correlationId || 'unknown';
    
    // Log the full error for debugging (server-side only)
    logger.error('Error occurred', {
        error: error.message,
        stack: error.stack,
        correlationId,
        userId: req.body?.userId || req.params?.userId,
        path: req.path,
        method: req.method
    });
    
    // Base error response
    const errorResponse = {
        success: false,
        error: 'An error occurred',
        correlationId,
        timestamp: new Date().toISOString()
    };
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
        errorResponse.error = 'Invalid input provided';
        errorResponse.code = 'VALIDATION_ERROR';
        
        if (isDevelopment && error.details) {
            errorResponse.details = error.details;
        }
        
        return { status: 400, response: errorResponse };
    }
    
    if (error.name === 'UnauthorizedError' || error.code === 'AUTH_ERROR') {
        errorResponse.error = 'Authentication required';
        errorResponse.code = 'AUTH_ERROR';
        return { status: 401, response: errorResponse };
    }
    
    if (error.name === 'ForbiddenError' || error.code === 'PERMISSION_ERROR') {
        errorResponse.error = 'Insufficient permissions';
        errorResponse.code = 'PERMISSION_ERROR';
        return { status: 403, response: errorResponse };
    }
    
    if (error.code === 'RATE_LIMIT_ERROR') {
        errorResponse.error = 'Too many requests. Please try again later';
        errorResponse.code = 'RATE_LIMIT_ERROR';
        return { status: 429, response: errorResponse };
    }
    
    if (error.code === 'TIMEOUT_ERROR') {
        errorResponse.error = 'Request timeout. Please try again';
        errorResponse.code = 'TIMEOUT_ERROR';
        return { status: 408, response: errorResponse };
    }
    
    if (error.code === 'NETWORK_ERROR') {
        errorResponse.error = 'Network error. Please check your connection';
        errorResponse.code = 'NETWORK_ERROR';
        return { status: 503, response: errorResponse };
    }
    
    // Handle Fal.ai specific errors
    if (error.code === 'GENERATION_ERROR') {
        errorResponse.error = 'Asset generation failed. Please try again';
        errorResponse.code = 'GENERATION_ERROR';
        return { status: 500, response: errorResponse };
    }
    
    // Handle session errors
    if (error.code === 'SESSION_ERROR') {
        errorResponse.error = 'Session error. Please restart your session';
        errorResponse.code = 'SESSION_ERROR';
        return { status: 400, response: errorResponse };
    }
    
    // Handle database errors
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
        errorResponse.error = 'Database error. Please try again later';
        errorResponse.code = 'DATABASE_ERROR';
        return { status: 500, response: errorResponse };
    }
    
    // Handle Redis errors
    if (error.name === 'RedisError' || error.code === 'REDIS_ERROR') {
        errorResponse.error = 'Session store error. Please try again';
        errorResponse.code = 'SESSION_STORE_ERROR';
        return { status: 500, response: errorResponse };
    }
    
    // Generic server error
    if (isDevelopment) {
        errorResponse.error = sanitizeErrorMessage(error.message);
        errorResponse.stack = error.stack;
    } else {
        errorResponse.error = 'Internal server error';
    }
    
    errorResponse.code = 'INTERNAL_ERROR';
    return { status: 500, response: errorResponse };
}

/**
 * Global error handling middleware
 */
const globalErrorHandler = (error, req, res, next) => {
    // Prevent error handler from crashing
    try {
        const { status, response } = createSafeErrorResponse(error, req);
        
        // Add security headers
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
        });
        
        res.status(status).json(response);
        
    } catch (handlerError) {
        // Fallback error response if error handler itself fails
        logger.error('Error handler failed', {
            originalError: error.message,
            handlerError: handlerError.message,
            correlationId: req.correlationId || 'unknown'
        });
        
        res.status(500).json({
            success: false,
            error: 'Critical error occurred',
            correlationId: req.correlationId || 'unknown',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Async error wrapper to catch promise rejections
 */
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
    logger.warn('Route not found', {
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};

/**
 * Unhandled rejection handler
 */
const unhandledRejectionHandler = (reason, promise) => {
    logger.error('Unhandled promise rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
    });
    
    // Don't exit the process in production, just log the error
    if (config.env === 'production') {
        logger.error('Unhandled rejection in production - not exiting process');
    } else {
        // In development, we might want to exit to catch these early
        logger.error('Exiting process due to unhandled rejection');
        process.exit(1);
    }
};

/**
 * Uncaught exception handler
 */
const uncaughtExceptionHandler = (error) => {
    logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
    });
    
    // Always exit on uncaught exceptions as the process is in an undefined state
    logger.error('Exiting process due to uncaught exception');
    process.exit(1);
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdownHandler = (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    // Set a timeout for forceful shutdown
    const forceTimeout = setTimeout(() => {
        logger.error('Forceful shutdown due to timeout');
        process.exit(1);
    }, 30000); // 30 seconds
    
    // Cleanup and close server gracefully
    const cleanup = async () => {
        try {
            // Close database connections, Redis connections, etc.
            logger.info('Cleaning up resources...');
            
            // Clear the force timeout
            clearTimeout(forceTimeout);
            
            logger.info('Graceful shutdown completed');
            process.exit(0);
            
        } catch (error) {
            logger.error('Error during graceful shutdown', { error: error.message });
            process.exit(1);
        }
    };
    
    cleanup();
};

/**
 * Initialize error handling
 */
const initializeErrorHandling = () => {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', unhandledRejectionHandler);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', uncaughtExceptionHandler);
    
    // Handle graceful shutdown signals
    process.on('SIGTERM', () => gracefulShutdownHandler('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdownHandler('SIGINT'));
    
    logger.info('Error handling initialized');
};

module.exports = {
    globalErrorHandler,
    asyncErrorHandler,
    notFoundHandler,
    sanitizeErrorMessage,
    createSafeErrorResponse,
    initializeErrorHandling
}; 