/**
 * @fileoverview Service Factory - Centralized service management and lifecycle
 * @description Manages all service instantiations, health checks, and graceful shutdown
 */

const logger = require('../utils/logger');

// Import all services
const textToImageService = require('./falai/textToImageService/textToImageService');
const textToVideoService = require('./falai/textToVideoService/textToVideoService');
const ImageToVideoService = require('./falai/imageToVideoService/imageToVideoService');
const TextToAudioService = require('./falai/textToAudioService/textToAudioService');
const TextToSpeechService = require('./falai/textToSpeechService/textToSpeechService');
const ImageToImageService = require('./falai/imageToImageService/imageToImageService');
const VideoToVideoService = require('./falai/videoToVideoService/videoToVideoService');
const ImageTo3DService = require('./falai/imageTo3DService/imageTo3DService');

class ServiceFactory {
    constructor() {
        // Use a plain object for service registry
        this.services = {};
        this.isInitialized = false;
    }

    /**
     * Initialize all services
     */
    initializeServices() {
        try {
            logger.info('Initializing Service Factory');

            // Register all services
            this.registerService('textToImage', textToImageService);
            this.registerService('textToVideo', textToVideoService);
            this.registerService('imageToVideo', new ImageToVideoService());
            this.registerService('textToAudio', new TextToAudioService());
            this.registerService('textToSpeech', new TextToSpeechService());
            this.registerService('imageToImage', new ImageToImageService());
            this.registerService('videoToVideo', new VideoToVideoService());
            this.registerService('imageTo3D', new ImageTo3DService());

            logger.info(`Service Factory initialized with ${Object.keys(this.services).length} services`, {
                services: Object.keys(this.services)
            });
            
            this.isInitialized = true;

        } catch (error) {
            logger.error('Failed to initialize Service Factory', error);
            throw error;
        }
    }

    registerService(name, service) {
        this.services[name] = service;
    }

    getService(name) {
        if (this.services[name]) return this.services[name];
        throw new Error(`Service '${name}' not found. Available services: ${Object.keys(this.services).join(', ')}`);
    }

    /**
     * Get all services
     * @returns {Object} All registered services
     */
    getAllServices() {
        return this.services;
    }

    /**
     * Get service names
     * @returns {Array<string>} Array of service names
     */
    getServiceNames() {
        return Object.keys(this.services);
    }

    /**
     * Check health of all services
     * @returns {Promise<Object>} Health status of all services
     */
    async checkAllServicesHealth() {
        const healthResults = {};
        const promises = [];

        for (const name in this.services) {
            const service = this.services[name];
            if (service && typeof service.getStatus === 'function') {
            promises.push(
                    service.getStatus().then(result => {
                    healthResults[name] = result;
                }).catch(error => {
                    healthResults[name] = {
                        status: 'error',
                        error: error.message,
                        service: name
                    };
                })
            );
            } else if (service && typeof service.getSupportedModels === 'function') {
                promises.push(
                    Promise.resolve({
                        status: 'operational',
                        models: service.getSupportedModels().length,
                        service: name
                    })
                );
            } else {
                promises.push(
                    Promise.resolve({
                        status: 'operational',
                        service: name
                    })
                );
            }
        }

        await Promise.all(promises);

        // Determine overall health
        const allHealthy = Object.values(healthResults).every(result => result.status === 'operational');
        
        return {
            overall: allHealthy ? 'healthy' : 'unhealthy',
            services: healthResults,
            timestamp: new Date().toISOString(),
            totalServices: Object.keys(this.services).length
        };
    }

    /**
     * Check health of specific service
     * @param {string} name - Service name
     * @returns {Promise<Object>} Health status
     */
    async checkServiceHealth(name) {
        const service = this.services[name];
        if (!service) {
            throw new Error(`Service '${name}' not found.`);
        }

        try {
            if (service.getStatus) {
                return await service.getStatus();
            } else if (service.getSupportedModels) {
                return {
                    status: 'operational',
                    models: service.getSupportedModels().length,
                    service: name
                };
            } else {
                return {
                    status: 'operational',
                    service: name
                };
            }
        } catch (error) {
            logger.error(`Health check failed for ${name}:`, error);
            return {
                status: 'error',
                error: error.message,
                service: name
            };
        }
    }

    /**
     * Graceful shutdown of all services
     */
    async shutdown() {
        if (this.isShuttingDown) {
            logger.warn('🔄 Shutdown already in progress');
            return;
        }

        this.isShuttingDown = true;
        logger.info('🛑 Starting Service Factory shutdown...');

        const shutdownPromises = [];

        for (const name in this.services) {
            const service = this.services[name];
            if (service && typeof service.shutdown === 'function') {
                shutdownPromises.push(
                    service.shutdown().then(() => {
                        logger.info(`✅ ${name} service shutdown complete`);
                    }).catch(error => {
                        logger.error(`❌ ${name} service shutdown failed:`, error);
                    })
                );
            } else {
                logger.debug(`⏭️ ${name} service has no shutdown method`);
            }
        }

        try {
            await Promise.allSettled(shutdownPromises);
            logger.info('🎉 Service Factory shutdown complete');
        } catch (error) {
            logger.error('❌ Service Factory shutdown failed:', error);
        }
    }

    /**
     * Get factory status
     * @returns {Object} Factory status
     */
    getStatus() {
        return {
            status: this.isShuttingDown ? 'shutting_down' : 'operational',
            totalServices: Object.keys(this.services).length,
            serviceNames: this.getServiceNames(),
            timestamp: new Date().toISOString()
        };
    }
}

// Create singleton instance
const serviceFactory = new ServiceFactory();

// Export the factory and individual services for backward compatibility
module.exports = { serviceFactory }; 