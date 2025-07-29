/**
 * @fileoverview Request Tracking Middleware - Adds request IDs and tracking
 * @description Provides request ID generation and propagation for distributed tracing
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Generate request ID middleware
 * Adds a unique request ID to each request for tracking
 */
function requestIdMiddleware(req, res, next) {
    // Check if request ID already exists (from upstream service)
    const existingRequestId = req.headers['x-request-id'] || 
                             req.headers['x-correlation-id'] ||
                             req.headers['x-trace-id'];
    
    // Generate or use existing request ID
    req.requestId = existingRequestId || uuidv4();
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.requestId);
    
    // Store request start time
    req.startTime = Date.now();
    
    // Add request ID to logger context for this request
    req.log = logger.child({ requestId: req.requestId });
    
    // Log request start
    req.log.info('Request started', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.body?.userId || req.params?.userId || 'anonymous'
    });
    
    // Track response
    const originalSend = res.send;
    res.send = function(data) {
        res.send = originalSend;
        
        // Calculate request duration
        const duration = Date.now() - req.startTime;
        
        // Log request completion
        req.log.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            contentLength: res.get('Content-Length') || 0
        });
        
        // Add timing header
        res.setHeader('X-Response-Time', `${duration}ms`);
        
        return res.send(data);
    };
    
    next();
}

/**
 * Request context middleware
 * Adds contextual information to requests
 */
function requestContextMiddleware(req, res, next) {
    // Create request context
    req.context = {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        service: 'backend-api',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    };
    
    // Add user context if available
    if (req.body?.userId || req.params?.userId) {
        req.context.userId = req.body?.userId || req.params?.userId;
    }
    
    // Add session context if available
    if (req.body?.sessionId || req.params?.sessionId) {
        req.context.sessionId = req.body?.sessionId || req.params?.sessionId;
    }
    
    // Add thread context if available
    if (req.body?.threadId || req.params?.threadId) {
        req.context.threadId = req.body?.threadId || req.params?.threadId;
    }
    
    next();
}

/**
 * Error tracking middleware
 * Ensures errors are properly logged with request context
 */
function errorTrackingMiddleware(err, req, res, next) {
    // Log error with full context
    const errorContext = {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: err.statusCode || 500,
        errorCode: err.code || 'UNKNOWN_ERROR',
        errorMessage: err.message,
        stack: err.stack,
        userId: req.context?.userId,
        sessionId: req.context?.sessionId,
        duration: Date.now() - req.startTime
    };
    
    // Log based on error severity
    if (err.statusCode >= 500 || !err.statusCode) {
        req.log.error('Request failed with server error', errorContext);
    } else if (err.statusCode >= 400) {
        req.log.warn('Request failed with client error', errorContext);
    } else {
        req.log.info('Request completed with error', errorContext);
    }
    
    // Pass to next error handler
    next(err);
}

/**
 * Async context propagation
 * Ensures request context is available in async operations
 */
class RequestContext {
    constructor() {
        this.storage = new Map();
    }
    
    run(requestId, callback) {
        this.storage.set('currentRequest', requestId);
        try {
            return callback();
        } finally {
            this.storage.delete('currentRequest');
        }
    }
    
    get() {
        return this.storage.get('currentRequest');
    }
}

const requestContext = new RequestContext();

/**
 * Get current request ID from async context
 */
function getCurrentRequestId() {
    return requestContext.get();
}

/**
 * Wrap async handlers to preserve request context
 */
function wrapAsyncHandler(handler) {
    return async (req, res, next) => {
        const requestId = req.requestId;
        
        try {
            await requestContext.run(requestId, async () => {
                await handler(req, res, next);
            });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Add request tracking to axios instance
 */
function addAxiosTracking(axiosInstance) {
    // Request interceptor
    axiosInstance.interceptors.request.use(
        (config) => {
            const requestId = getCurrentRequestId();
            if (requestId) {
                config.headers['X-Request-ID'] = requestId;
            }
            
            // Log outgoing request
            logger.debug('Outgoing HTTP request', {
                requestId,
                method: config.method,
                url: config.url,
                baseURL: config.baseURL
            });
            
            return config;
        },
        (error) => {
            const requestId = getCurrentRequestId();
            logger.error('Outgoing HTTP request error', {
                requestId,
                error: error.message
            });
            return Promise.reject(error);
        }
    );
    
    // Response interceptor
    axiosInstance.interceptors.response.use(
        (response) => {
            const requestId = response.config.headers?.['X-Request-ID'];
            logger.debug('Incoming HTTP response', {
                requestId,
                status: response.status,
                url: response.config.url
            });
            return response;
        },
        (error) => {
            const requestId = error.config?.headers?.['X-Request-ID'];
            logger.error('Incoming HTTP response error', {
                requestId,
                status: error.response?.status,
                url: error.config?.url,
                error: error.message
            });
            return Promise.reject(error);
        }
    );
}

module.exports = {
    requestIdMiddleware,
    requestContextMiddleware,
    errorTrackingMiddleware,
    getCurrentRequestId,
    wrapAsyncHandler,
    addAxiosTracking,
    requestContext
}; 