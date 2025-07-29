/**
 * @fileoverview Pure Backend API Server - Express.js server without Slack integration
 * @description Standalone API server for the Slack AI Asset Generator backend
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import new middleware
const { globalErrorHandler } = require('./middleware/errorHandler');
const { validateConfig, checkRequiredEnvVars, validateEnvironmentConfig } = require('./config/validation');
// Input sanitization middleware - removed as it's handled in route-level validation
const { 
  generalLimiter, 
  generationLimiter, 
  brandResearchLimiter, 
  modelListingLimiter, 
  healthCheckLimiter 
} = require('./middleware/rateLimit');
const { 
  initializeHealthCheck,
  healthCheckMiddleware,
  readinessCheckMiddleware,
  livenessCheckMiddleware 
} = require('./middleware/healthCheck');
const {
  requestIdMiddleware,
  requestContextMiddleware,
  errorTrackingMiddleware
} = require('./middleware/requestTracking');
const {
  securityMiddleware,
  authorizeSlackUser,
  validateSession
} = require('./middleware/security');

// Import utilities
const logManager = require('./utils/logManager');
const portManager = require('./utils/portManager');

// Setup global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

console.log('[DEBUG] server.js starting...');

// Import configuration and utilities with error handling
let config, logger, mcpRoutes;

try {
    config = require('./config');
    
    // Validate configuration
    validateConfig(config);
    checkRequiredEnvVars();
    validateEnvironmentConfig();
    
    // Validate security configuration
    if (!config.security.jwtSecret) {
        throw new Error('JWT_SECRET environment variable is required for security');
    }
    if (config.security.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }
} catch (error) {
    console.error('[DEBUG] Error loading config:', error);
    process.exit(1);
}

try {
    logger = require('./utils/logger');
} catch (error) {
    console.error('[DEBUG] Error loading logger:', error);
    process.exit(1);
}

try {
    mcpRoutes = require('./routes/mcpRoutes');
} catch (error) {
    console.error('[DEBUG] Error loading mcpRoutes:', error);
    process.exit(1);
}

class BackendAPIServer {
    constructor() {
        try {
            this.app = express();
        } catch (error) {
            throw error;
        }

        try {
            this.setupMiddleware();
        } catch (error) {
            throw error;
        }

        try {
            this.setupRoutes();
        } catch (error) {
            throw error;
        }

        try {
            this.setupErrorHandling();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Enhanced security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://api.fal.ai", "https://generativelanguage.googleapis.com"]
                }
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: config.security?.allowedOrigins?.length > 0 ? config.security.allowedOrigins : true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Request tracking middleware - must be early in the chain
        this.app.use(requestIdMiddleware);
        this.app.use(requestContextMiddleware);

        // Comprehensive security middleware
        this.app.use(securityMiddleware);

        // Body parsing middleware
        this.app.use(bodyParser.json({ 
            limit: '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            }
        }));
        this.app.use(bodyParser.urlencoded({ 
            extended: true, 
            limit: '10mb' 
        }));

        // Request logging middleware - now uses request tracking
        this.app.use((req, res, next) => {
            // Logging is now handled by requestIdMiddleware
            next();
        });
    }

    /**
     * Setup Express routes
     */
    setupRoutes() {
        // Initialize health check service
        const healthService = initializeHealthCheck();
        
        // Register Fal.ai services for health checks
        if (this.falaiServices) {
            healthService.registerCheck('falai', async () => {
                return await healthService.checkFalaiServices(this.falaiServices);
            });
        }
        
        // Health check endpoints
        this.app.get('/health', healthCheckLimiter, healthCheckMiddleware);
        this.app.get('/health/ready', healthCheckLimiter, readinessCheckMiddleware);
        this.app.get('/health/live', healthCheckLimiter, livenessCheckMiddleware);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Slack AI Asset Generator API',
                version: '1.0.0',
                environment: config.app.env,
                endpoints: {
                    health: '/health',
                    api: '/api'
                }
            });
        });

        // Apply general rate limiting to all API routes
        this.app.use('/api', generalLimiter);

        // Apply specific rate limiting to different endpoint types
        this.app.use('/api/generate-asset', generationLimiter);
        this.app.use('/api/brand-research', brandResearchLimiter);
        this.app.use('/api/models', modelListingLimiter);

        // Mount MCP routes with validation
        this.app.use('/api', mcpRoutes);

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.originalUrl
            });
        });
    }

    /**
     * Setup error handling middleware
     */
    setupErrorHandling() {
        const { globalErrorHandler } = require('./middleware/errorHandler');
        
        // Error tracking middleware (must be before global error handler)
        this.app.use(errorTrackingMiddleware);
        
        // Global error handler (must be last)
        this.app.use(globalErrorHandler);
    }

    /**
     * Start the server
     */
    async start() {
        try {
            // Initialize log management
            await logManager.initialize();
            
            // Validate and get available port
            const desiredPort = process.env.PORT || 3000;
            const availablePort = await portManager.handlePortConflict(desiredPort, false);
            
            return new Promise((resolve, reject) => {
                this.server = this.app.listen(availablePort, () => {
                    console.log(`[STARTUP] Backend API Server is running and listening on port ${availablePort}`);
                    console.log(`[STARTUP] Health check: http://localhost:${availablePort}/health`);
                    
                    // Log startup information
                    logger.info('Backend API Server started successfully', {
                        port: availablePort,
                        environment: process.env.NODE_ENV || 'development',
                        pid: process.pid
                    });
                    
                    resolve();
                });

                this.server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        logger.error(`Port ${availablePort} is already in use`, { error: error.message });
                    } else {
                        logger.error('Server startup failed', { error: error.message });
                    }
                    reject(error);
                });
            });
        } catch (error) {
            logger.error('Failed to start server', error);
            throw error;
        }
    }

    /**
     * Gracefully shutdown the server
     */
    async shutdown() {
        logger.info('Shutting down server gracefully');
        
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    logger.info('Express server closed');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// Main execution
async function main() {
    try {
        if (require.main === module) {
            const server = new BackendAPIServer();
            await server.start();
            
            // Handle graceful shutdown
            const shutdown = async (signal) => {
                try {
                    await server.shutdown();
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown', error);
                    process.exit(1);
                }
            };

            process.on('SIGTERM', () => shutdown('SIGTERM'));
            process.on('SIGINT', () => shutdown('SIGINT'));
        }
    } catch (error) {
        logger.error('Failed to start Backend API Server', error);
        process.exit(1);
    }
}

// Export for testing
module.exports = BackendAPIServer; 

// Run if this is the main module
if (require.main === module) {
    main().catch((error) => {
        logger.error('Unhandled error in main execution', error);
        process.exit(1);
    });
}
