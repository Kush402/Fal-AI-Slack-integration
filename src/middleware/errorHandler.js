const logger = require('../utils/logger');

/**
 * Async error handler wrapper for Express routes
 */
function asyncErrorHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Global error handling middleware
 */
function globalErrorHandler(error, req, res, next) {
    // Log the error with context
    logger.error('Global error handler caught error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Determine error type and response
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    let errorDetails = null;

    // Handle validation errors
    if (error.name === 'ValidationError' || error.message.includes('Validation failed')) {
        statusCode = 400;
        errorMessage = 'Validation failed';
        errorDetails = error.details || error.message;
    }

    // Handle authentication errors
    if (error.name === 'UnauthorizedError' || error.message.includes('Unauthorized')) {
        statusCode = 401;
        errorMessage = 'Unauthorized';
    }

    // Handle not found errors
    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
        statusCode = 404;
        errorMessage = 'Resource not found';
    }

    // Handle rate limiting errors
    if (error.message.includes('rate limit')) {
        statusCode = 429;
        errorMessage = 'Too many requests';
    }

    // Handle external API errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        statusCode = 503;
        errorMessage = 'Service temporarily unavailable';
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    });
}

/**
 * Validation error formatter
 */
function formatValidationErrors(errors) {
    return errors.map(error => ({
        field: error.path || error.field,
        message: error.message || error.msg,
        value: error.value
    }));
}

/**
 * Sanitize error messages for production
 */
function sanitizeErrorMessage(message, isProduction = false) {
    if (!isProduction) {
        return message;
    }
    
    // Remove sensitive information from error messages
    return message
        .replace(/api[_-]?key/gi, '[API_KEY]')
        .replace(/token/gi, '[TOKEN]')
        .replace(/password/gi, '[PASSWORD]')
        .replace(/secret/gi, '[SECRET]');
}

module.exports = {
    asyncErrorHandler,
    globalErrorHandler,
    formatValidationErrors,
    sanitizeErrorMessage
}; 