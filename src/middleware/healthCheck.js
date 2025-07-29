/**
 * @fileoverview Health Check Middleware - Comprehensive system health monitoring
 * @description Provides detailed health checks for all subsystems including Redis, Fal.ai services,
 * Google services, and internal components
 */

const logger = require('../utils/logger');
const config = require('../config');
const Redis = require('ioredis');

class HealthCheckService {
    constructor() {
        this.checks = new Map();
        this.lastCheckResults = new Map();
        this.checkInterval = 30000; // 30 seconds
        
        // Register default checks
        this.registerCheck('system', this.checkSystem.bind(this));
        this.registerCheck('redis', this.checkRedis.bind(this));
        this.registerCheck('memory', this.checkMemory.bind(this));
        this.registerCheck('disk', this.checkDisk.bind(this));
        
        // Start periodic health checks
        this.startPeriodicChecks();
    }

    /**
     * Register a health check
     */
    registerCheck(name, checkFunction) {
        this.checks.set(name, checkFunction);
    }

    /**
     * Start periodic health checks
     */
    startPeriodicChecks() {
        setInterval(async () => {
            try {
                await this.runAllChecks();
            } catch (error) {
                logger.error('Periodic health check failed', error);
            }
        }, this.checkInterval);
    }

    /**
     * Run all health checks
     */
    async runAllChecks() {
        const results = {};
        const startTime = Date.now();
        
        for (const [name, checkFunction] of this.checks) {
            try {
                const checkStart = Date.now();
                const result = await checkFunction();
                const duration = Date.now() - checkStart;
                
                results[name] = {
                    ...result,
                    duration,
                    timestamp: new Date().toISOString()
                };
                
                this.lastCheckResults.set(name, results[name]);
            } catch (error) {
                results[name] = {
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                
                logger.error(`Health check failed: ${name}`, error);
            }
        }
        
        const totalDuration = Date.now() - startTime;
        
        return {
            status: this.calculateOverallStatus(results),
            timestamp: new Date().toISOString(),
            duration: totalDuration,
            checks: results
        };
    }

    /**
     * Calculate overall system status
     */
    calculateOverallStatus(results) {
        const statuses = Object.values(results).map(r => r.status);
        
        if (statuses.every(s => s === 'healthy')) {
            return 'healthy';
        } else if (statuses.some(s => s === 'unhealthy')) {
            return 'unhealthy';
        } else {
            return 'degraded';
        }
    }

    /**
     * Check system resources
     */
    async checkSystem() {
        const usage = process.cpuUsage();
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();
        
        return {
            status: 'healthy',
            details: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: Math.floor(uptime),
                pid: process.pid,
                cpu: {
                    user: Math.round(usage.user / 1000),
                    system: Math.round(usage.system / 1000)
                },
                memory: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024),
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024)
                }
            }
        };
    }

    /**
     * Check Redis connectivity
     */
    async checkRedis() {
        if (config.session.storageType !== 'redis') {
            return {
                status: 'not_applicable',
                details: { message: 'Using memory storage' }
            };
        }

        const redis = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db,
            connectTimeout: 5000,
            lazyConnect: true
        });

        try {
            await redis.connect();
            await redis.ping();
            
            const info = await redis.info();
            const clients = info.match(/connected_clients:(\d+)/)?.[1];
            const memory = info.match(/used_memory_human:([^\r\n]+)/)?.[1];
            
            await redis.disconnect();
            
            return {
                status: 'healthy',
                details: {
                    host: config.redis.host,
                    port: config.redis.port,
                    connectedClients: clients,
                    memoryUsage: memory
                }
            };
        } catch (error) {
            await redis.disconnect().catch(() => {});
            
            return {
                status: 'unhealthy',
                error: error.message,
                details: {
                    host: config.redis.host,
                    port: config.redis.port
                }
            };
        }
    }

    /**
     * Check memory usage
     */
    async checkMemory() {
        const memoryUsage = process.memoryUsage();
        const totalMemory = require('os').totalmem();
        const freeMemory = require('os').freemem();
        
        const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        const systemUsedPercent = ((totalMemory - freeMemory) / totalMemory) * 100;
        
        let status = 'healthy';
        if (heapUsedPercent > 90 || systemUsedPercent > 90) {
            status = 'unhealthy';
        } else if (heapUsedPercent > 75 || systemUsedPercent > 75) {
            status = 'degraded';
        }
        
        return {
            status,
            details: {
                heap: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    percent: Math.round(heapUsedPercent)
                },
                system: {
                    used: Math.round((totalMemory - freeMemory) / 1024 / 1024),
                    total: Math.round(totalMemory / 1024 / 1024),
                    percent: Math.round(systemUsedPercent)
                }
            }
        };
    }

    /**
     * Check disk usage
     */
    async checkDisk() {
        // This is a simplified check - in production you'd use a proper disk usage library
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const stats = await fs.statfs(path.resolve('./'));
            const totalSpace = stats.blocks * stats.bsize;
            const freeSpace = stats.bavail * stats.bsize;
            const usedSpace = totalSpace - freeSpace;
            const usedPercent = (usedSpace / totalSpace) * 100;
            
            let status = 'healthy';
            if (usedPercent > 90) {
                status = 'unhealthy';
            } else if (usedPercent > 80) {
                status = 'degraded';
            }
            
            return {
                status,
                details: {
                    used: Math.round(usedSpace / 1024 / 1024 / 1024),
                    total: Math.round(totalSpace / 1024 / 1024 / 1024),
                    free: Math.round(freeSpace / 1024 / 1024 / 1024),
                    percent: Math.round(usedPercent)
                }
            };
        } catch (error) {
            // Fallback for systems without statfs
            return {
                status: 'unknown',
                details: { message: 'Disk check not available' }
            };
        }
    }

    /**
     * Check Fal.ai services
     */
    async checkFalaiServices(services) {
        const results = {};
        
        for (const [name, service] of Object.entries(services)) {
            if (!service || !service.getStatus) {
                results[name] = {
                    status: 'not_initialized',
                    details: { message: 'Service not initialized' }
                };
                continue;
            }
            
            try {
                const status = service.getStatus();
                results[name] = {
                    status: status.status === 'operational' ? 'healthy' : 'degraded',
                    details: status
                };
            } catch (error) {
                results[name] = {
                    status: 'unhealthy',
                    error: error.message
                };
            }
        }
        
        return {
            status: this.calculateOverallStatus(results),
            services: results
        };
    }

    /**
     * Get cached health status
     */
    getCachedStatus() {
        const results = {};
        
        for (const [name, result] of this.lastCheckResults) {
            results[name] = result;
        }
        
        return {
            status: this.calculateOverallStatus(results),
            timestamp: new Date().toISOString(),
            checks: results,
            cached: true
        };
    }
}

// Singleton instance
let healthCheckService = null;

/**
 * Initialize health check service
 */
function initializeHealthCheck() {
    if (!healthCheckService) {
        healthCheckService = new HealthCheckService();
    }
    return healthCheckService;
}

/**
 * Express middleware for health check endpoint
 */
async function healthCheckMiddleware(req, res) {
    try {
        const service = initializeHealthCheck();
        
        // Check if we want detailed or simple health check
        const detailed = req.query.detailed === 'true';
        const cached = req.query.cached === 'true';
        
        if (cached) {
            const status = service.getCachedStatus();
            res.status(status.status === 'healthy' ? 200 : 503).json(status);
        } else if (detailed) {
            const status = await service.runAllChecks();
            res.status(status.status === 'healthy' ? 200 : 503).json(status);
        } else {
            // Simple health check
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('Health check endpoint error', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Readiness check middleware
 */
async function readinessCheckMiddleware(req, res) {
    try {
        const service = initializeHealthCheck();
        const status = service.getCachedStatus();
        
        // For readiness, we're more strict - any degradation means not ready
        const isReady = status.status === 'healthy';
        
        res.status(isReady ? 200 : 503).json({
            ready: isReady,
            status: status.status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            ready: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Liveness check middleware
 */
function livenessCheckMiddleware(req, res) {
    // Liveness just checks if the process is responsive
    res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString()
    });
}

module.exports = {
    initializeHealthCheck,
    healthCheckMiddleware,
    readinessCheckMiddleware,
    livenessCheckMiddleware,
    HealthCheckService
}; 