const logger = require('../utils/logger');
const config = require('../config');

/**
 * Timeout handling middleware for long-running operations
 * Provides graceful fallbacks for Fal.ai operations that may timeout
 */

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise(timeoutMs, operation = 'operation') {
    return new Promise((_, reject) => {
        setTimeout(() => {
            const error = new Error(`${operation} timed out after ${timeoutMs}ms`);
            error.code = 'TIMEOUT_ERROR';
            error.timeout = timeoutMs;
            reject(error);
        }, timeoutMs);
    });
}

/**
 * Wrap a promise with timeout handling
 */
function withTimeout(promise, timeoutMs, operation = 'operation') {
    return Promise.race([
        promise,
        createTimeoutPromise(timeoutMs, operation)
    ]);
}

/**
 * Configuration for different operation timeouts
 */
const OPERATION_TIMEOUTS = {
    'text-to-image': {
        timeout: 120000,  // 2 minutes
        fallbackTimeout: 180000,  // 3 minutes fallback
        description: 'Image generation'
    },
    'text-to-video': {
        timeout: 1200000,        // 20 minutes (increased for slowest models)
        fallbackTimeout: 1800000,  // 30 minutes (increased for slowest models)
        description: 'Video generation'
    },
    'image-to-image': {
        timeout: 120000,  // 2 minutes
        fallbackTimeout: 180000,  // 3 minutes fallback
        description: 'Image transformation'
    },
    'image-to-video': {
        timeout: 300000,  // 5 minutes
        fallbackTimeout: 600000,  // 10 minutes fallback
        description: 'Image to video conversion'
    },
    'text-to-audio': {
        timeout: 120000,  // 2 minutes
        fallbackTimeout: 180000,  // 3 minutes fallback
        description: 'Audio generation'
    },
    'text-to-speech': {
        timeout: 60000,   // 1 minute
        fallbackTimeout: 120000,  // 2 minutes fallback
        description: 'Text to speech conversion'
    },
    'video-to-video': {
        timeout: 600000,  // 10 minutes
        fallbackTimeout: 900000,  // 15 minutes fallback
        description: 'Video processing'
    },
    'brand-research': {
        timeout: 60000,   // 1 minute
        fallbackTimeout: 120000,  // 2 minutes fallback
        description: 'Brand research'
    },

    'default': {
        timeout: 180000,  // 3 minutes
        fallbackTimeout: 300000,  // 5 minutes fallback
        description: 'Default operation'
    }
};

/**
 * Get timeout configuration for operation
 */
function getTimeoutConfig(operation) {
    return OPERATION_TIMEOUTS[operation] || OPERATION_TIMEOUTS.default;
}

/**
 * Timeout middleware for API requests
 */
const timeoutMiddleware = (req, res, next) => {
    const operation = req.body?.parameters?.operation || req.params?.operation || 'default';
    const config = getTimeoutConfig(operation);
    
    // Set request timeout
    req.setTimeout(config.fallbackTimeout, () => {
        logger.warn('Request timeout', {
            operation,
            timeout: config.fallbackTimeout,
            userId: req.body?.userId,
            path: req.path
        });
        
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                error: `${config.description} is taking longer than expected. Please try again.`,
                code: 'REQUEST_TIMEOUT',
                timeout: config.fallbackTimeout
            });
        }
    });
    
    // Add timeout config to request for use in handlers
    req.timeoutConfig = config;
    next();
};

/**
 * Wrap Fal.ai service calls with timeout and retry logic
 */
async function withFalaiTimeout(serviceCall, operation, options = {}) {
    const config = getTimeoutConfig(operation);
    const maxRetries = options.maxRetries || 2;
    const retryDelay = options.retryDelay || 5000;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.debug('Starting Fal.ai operation', {
                operation,
                attempt,
                maxRetries,
                timeout: config.timeout
            });
            
            // Try with primary timeout
            const result = await withTimeout(
                serviceCall(),
                config.timeout,
                `${config.description} (attempt ${attempt})`
            );
            
            logger.info('Fal.ai operation completed', {
                operation,
                attempt,
                success: true
            });
            
            return result;
            
        } catch (error) {
            lastError = error;
            
            logger.warn('Fal.ai operation failed', {
                operation,
                attempt,
                maxRetries,
                error: error.message,
                isTimeout: error.code === 'TIMEOUT_ERROR'
            });
            
            // If it's the last attempt or not a timeout error, don't retry
            if (attempt === maxRetries || error.code !== 'TIMEOUT_ERROR') {
                break;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
    }
    
    // All attempts failed
    logger.error('Fal.ai operation failed after all retries', {
        operation,
        maxRetries,
        finalError: lastError.message
    });
    
    // Create appropriate error response
    if (lastError.code === 'TIMEOUT_ERROR') {
        const error = new Error(`${config.description} timed out. The operation is taking longer than expected.`);
        error.code = 'GENERATION_TIMEOUT';
        error.operation = operation;
        error.retries = maxRetries;
        throw error;
    }
    
    throw lastError;
}

/**
 * Monitor long-running operations and provide status updates
 */
class OperationMonitor {
    constructor() {
        this.activeOperations = new Map();
        this.statusUpdateInterval = 30000; // 30 seconds
    }
    
    /**
     * Start monitoring an operation
     */
    startMonitoring(operationId, operation, userId, threadId) {
        const startTime = Date.now();
        const config = getTimeoutConfig(operation);
        
        const monitor = {
            operationId,
            operation,
            userId,
            threadId,
            startTime,
            config,
            statusUpdates: 0
        };
        
        this.activeOperations.set(operationId, monitor);
        
        // Set up periodic status updates
        monitor.interval = setInterval(() => {
            this.sendStatusUpdate(monitor);
        }, this.statusUpdateInterval);
        
        // Set up timeout warning
        monitor.warningTimeout = setTimeout(() => {
            this.sendTimeoutWarning(monitor);
        }, config.timeout * 0.8); // Warn at 80% of timeout
        
        logger.debug('Started operation monitoring', {
            operationId,
            operation,
            userId,
            threadId
        });
    }
    
    /**
     * Stop monitoring an operation
     */
    stopMonitoring(operationId) {
        const monitor = this.activeOperations.get(operationId);
        if (monitor) {
            clearInterval(monitor.interval);
            clearTimeout(monitor.warningTimeout);
            this.activeOperations.delete(operationId);
            
            const duration = Date.now() - monitor.startTime;
            logger.debug('Stopped operation monitoring', {
                operationId: monitor.operationId,
                duration,
                statusUpdates: monitor.statusUpdates
            });
        }
    }
    
    /**
     * Send status update
     */
    sendStatusUpdate(monitor) {
        const duration = Date.now() - monitor.startTime;
        monitor.statusUpdates++;
        
        logger.debug('Operation status update', {
            operationId: monitor.operationId,
            operation: monitor.operation,
            duration,
            statusUpdates: monitor.statusUpdates
        });
        
        // Send status update to Slack if available
        this.sendSlackStatusUpdate(monitor, duration);
    }

    /**
     * Send status update to Slack
     */
    sendSlackStatusUpdate(monitor, duration) {
        try {
            const { slackBot } = require('../services/slack/slackBot');
            if (slackBot && monitor.threadId) {
                const minutes = Math.floor(duration / 60000);
                const message = `🔄 Your ${monitor.operation} is still processing... (${minutes} minutes elapsed)`;
                
                slackBot.client.chat.postMessage({
                    channel: monitor.userId,
                    thread_ts: monitor.threadId,
                    text: message
                }).catch(error => {
                    logger.warn('Failed to send Slack status update', {
                        error: error.message,
                        operationId: monitor.operationId
                    });
                });
            }
        } catch (error) {
            logger.debug('Slack bot not available for status updates', {
                error: error.message,
                operationId: monitor.operationId
            });
        }
    }
    
    /**
     * Send timeout warning
     */
    sendTimeoutWarning(monitor) {
        const duration = Date.now() - monitor.startTime;
        
        logger.warn('Operation approaching timeout', {
            operationId: monitor.operationId,
            operation: monitor.operation,
            duration,
            timeoutThreshold: monitor.config.timeout
        });
        
        // Send timeout warning to Slack if available
        this.sendSlackTimeoutWarning(monitor, duration);
    }

    /**
     * Send timeout warning to Slack
     */
    sendSlackTimeoutWarning(monitor, duration) {
        try {
            const { slackBot } = require('../services/slack/slackBot');
            if (slackBot && monitor.threadId) {
                const minutes = Math.floor(duration / 60000);
                const timeoutMinutes = Math.floor(monitor.config.timeout / 60000);
                const message = `⚠️ Your ${monitor.operation} is taking longer than expected (${minutes}/${timeoutMinutes} minutes). This may timeout soon.`;
                
                slackBot.client.chat.postMessage({
                    channel: monitor.userId,
                    thread_ts: monitor.threadId,
                    text: message
                }).catch(error => {
                    logger.warn('Failed to send Slack timeout warning', {
                        error: error.message,
                        operationId: monitor.operationId
                    });
                });
            }
        } catch (error) {
            logger.debug('Slack bot not available for timeout warnings', {
                error: error.message,
                operationId: monitor.operationId
            });
        }
    }
    
    /**
     * Get status of all active operations
     */
    getActiveOperations() {
        const operations = [];
        
        for (const [operationId, monitor] of this.activeOperations) {
            const duration = Date.now() - monitor.startTime;
            operations.push({
                operationId,
                operation: monitor.operation,
                userId: monitor.userId,
                threadId: monitor.threadId,
                duration,
                statusUpdates: monitor.statusUpdates,
                timeoutAt: monitor.config.timeout
            });
        }
        
        return operations;
    }
}

// Global operation monitor instance
const operationMonitor = new OperationMonitor();

/**
 * Graceful shutdown handler for active operations
 */
function gracefulShutdown() {
    logger.info('Shutting down operation monitor', {
        activeOperations: operationMonitor.activeOperations.size
    });
    
    // Stop all monitoring
    for (const operationId of operationMonitor.activeOperations.keys()) {
        operationMonitor.stopMonitoring(operationId);
    }
}

// Handle process shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = {
    timeoutMiddleware,
    withTimeout,
    withFalaiTimeout,
    getTimeoutConfig,
    operationMonitor,
    createTimeoutPromise,
    OPERATION_TIMEOUTS
}; 