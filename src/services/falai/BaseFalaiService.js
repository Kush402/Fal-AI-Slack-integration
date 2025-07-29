/**
 * @fileoverview Base Fal.ai Service - Unified service architecture
 * @description Provides consistent patterns for all Fal.ai services including error handling, logging, and response formatting
 */

const { fal } = require('@fal-ai/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config');
const ValidationUtils = require('../../utils/validation');
const ResponseFormatter = require('../../utils/responseFormatter');
const { uploadAssetToDrive, driveService } = require('../drive/driveUploadHelper');

// Configure Fal.ai client
fal.config({
    credentials: config.falai.apiKey || process.env.FAL_AI_KEY
});

class BaseFalaiService {
    constructor(serviceName, supportedModels = []) {
        this.serviceName = serviceName;
        this.supportedModels = supportedModels;
        this.timeout = config.falai.timeout || 60000;
        this.maxRetries = config.falai.maxRetries || 3;
        this.retryDelay = config.falai.retryDelay || 1000;
        
        logger.info(`${serviceName} service initialized`, {
            modelCount: supportedModels.length,
            timeout: this.timeout,
            maxRetries: this.maxRetries
        });
    }

    /**
     * Generate content using Fal.ai
     * @param {string} modelId - Model identifier
     * @param {Object} input - Input parameters
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Generation result
     */
    async generateContent(modelId, input = {}, options = {}) {
        throw new Error('Fal model asset generation not implemented.');
    }

    /**
     * Generate content with Google Drive upload
     * @param {string} modelId - Model identifier
     * @param {Object} input - Input parameters
     * @param {Object} options - Additional options including session info
     * @returns {Promise<Object>} Generation result with Drive upload info
     */
    async generateContentWithDrive(modelId, input = {}, options = {}) {
        throw new Error('Fal model asset generation not implemented.');
    }

    /**
     * Validate model and input parameters
     * @param {string} modelId - Model identifier
     * @param {Object} input - Input parameters
     * @param {Object} options - Additional options
     */
    validateModelAndInputs(modelId, input, options = {}) {
        // Severe logging to identify the issue
        logger.error('[SEVERE] validateModelAndInputs called', {
            modelId,
            inputType: typeof input,
            inputKeys: input ? Object.keys(input) : [],
            optionsKeys: Object.keys(options),
            serviceName: this.serviceName,
            supportedModelsType: typeof this.supportedModels,
            supportedModelsLength: this.supportedModels ? this.supportedModels.length : 'undefined'
        });

        // Validate model ID
        logger.error('[SEVERE] About to validate model ID', { modelId, supportedModels: this.supportedModels });
        const supportedModelIds = this.supportedModels ? this.supportedModels.map(m => m.id) : [];
        logger.error('[SEVERE] Supported model IDs', { supportedModelIds });
        const modelValidation = ValidationUtils.validateModelId(modelId, supportedModelIds);
        logger.error('[SEVERE] Model validation result', { modelValidation });
        if (!modelValidation.isValid) {
            throw new Error(`Model validation failed: ${modelValidation.errors.join(', ')}`);
        }

        // Validate session if provided
        if (options.sessionId) {
            logger.error('[SEVERE] About to validate session', { sessionId: options.sessionId });
            const sessionValidation = ValidationUtils.validateSession({
                sessionId: options.sessionId,
                userId: options.userId || 'unknown'
            });
            logger.error('[SEVERE] Session validation result', { sessionValidation });
            if (!sessionValidation.isValid) {
                throw new Error(`Session validation failed: ${sessionValidation.errors.join(', ')}`);
            }
        }

        // Model-specific validation
        logger.error('[SEVERE] About to call validateModelSpecificInputs', { modelId, input });
        this.validateModelSpecificInputs(modelId, input);
        logger.error('[SEVERE] validateModelSpecificInputs completed', { modelId });

        // Log validation success
        ValidationUtils.logValidationErrors({ isValid: true }, `${this.serviceName} input validation`);
    }

    /**
     * Generate content using Fal.ai client
     * @param {string} modelId - Model identifier
     * @param {Object} input - Input parameters
     * @param {string} jobId - Job identifier
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Fal.ai result
     */
    async generateWithFal(modelId, input, jobId, sessionId) {
        throw new Error('Fal model asset generation not implemented.');
    }

    /**
     * Upload assets to Google Drive
     * @param {Object} processedResult - Processed generation result
     * @param {Object} options - Upload options
     * @param {string} jobId - Job identifier
     * @returns {Promise<Array>} Drive upload results
     */
    async uploadToDrive(processedResult, options, jobId) {
        throw new Error('Fal model asset generation not implemented.');
    }

    /**
     * Handle errors and provide meaningful error messages
     * @param {Error} error - Original error
     * @param {string} jobId - Job identifier
     * @param {string} modelId - Model identifier
     * @returns {Error} Processed error
     */
    handleError(error, jobId, modelId) {
        let errorMessage = `${this.serviceName} generation failed`;
        let errorCode = 'GENERATION_ERROR';

        if (error.message.includes('API_KEY')) {
            errorMessage = 'Invalid API key. Please check your Fal.ai configuration.';
            errorCode = 'AUTH_ERROR';
        } else if (error.message.includes('QUOTA')) {
            errorMessage = 'API quota exceeded. Please try again later.';
            errorCode = 'QUOTA_ERROR';
        } else if (error.message.includes('TIMEOUT')) {
            errorMessage = 'Request timeout. Please try again.';
            errorCode = 'TIMEOUT_ERROR';
        } else if (error.message.includes('SAFETY')) {
            errorMessage = 'Content blocked by safety filters. Please revise your input.';
            errorCode = 'SAFETY_ERROR';
        }

        const processedError = new Error(errorMessage);
        processedError.code = errorCode;
        processedError.jobId = jobId;
        processedError.modelId = modelId;
        processedError.originalError = error;

        return processedError;
    }

    /**
     * Find model by ID
     * @param {string} modelId - Model identifier
     * @returns {Object|null} Model configuration
     */
    findModel(modelId) {
        logger.error('[SEVERE] findModel called', { 
            modelId, 
            supportedModelsType: typeof this.supportedModels,
            supportedModelsIsArray: Array.isArray(this.supportedModels),
            supportedModelsLength: this.supportedModels ? this.supportedModels.length : 'undefined',
            supportedModels: this.supportedModels
        });
        
        if (!this.supportedModels || !Array.isArray(this.supportedModels)) {
            logger.error('[SEVERE] supportedModels is invalid', { 
                modelId, 
                supportedModels: this.supportedModels,
                supportedModelsType: typeof this.supportedModels
            });
            return null;
        }
        
        const model = this.supportedModels.find(model => model.id === modelId) || null;
        logger.error('[SEVERE] findModel result', { modelId, model });
        return model;
    }

    /**
     * Get supported models
     * @returns {Array} Supported models
     */
    getSupportedModels() {
        const logger = require('../../utils/logger');
        logger.error('[SEVERE] getSupportedModels called', { 
            supportedModels: this.supportedModels,
            supportedModelsType: typeof this.supportedModels,
            supportedModelsLength: this.supportedModels ? this.supportedModels.length : 'undefined'
        });
        return this.supportedModels;
    }

    /**
     * Get service status
     * @returns {Object} Service status
     */
    getStatus() {
        const logger = require('../../utils/logger');
        logger.error('[SEVERE] getStatus called', { 
            serviceName: this.serviceName,
            supportedModelsType: typeof this.supportedModels,
            supportedModelsLength: this.supportedModels ? this.supportedModels.length : 'undefined'
        });
        
        return {
            service: this.serviceName,
            status: 'operational',
            modelCount: this.supportedModels ? this.supportedModels.length : 0,
            timeout: this.timeout,
            maxRetries: this.maxRetries,
            retryDelay: this.retryDelay,
            features: {
                contentGeneration: true,
                driveUpload: true,
                errorHandling: true,
                logging: true,
                validation: true
            }
        };
    }

    // Abstract methods to be implemented by subclasses
    processResult(result, jobId) {
        const logger = require('../../utils/logger');
        logger.error('[SEVERE] processResult called on base class', { jobId, result });
        throw new Error('processResult must be implemented by subclass');
    }

    extractAssetUrls(result) {
        const logger = require('../../utils/logger');
        logger.error('[SEVERE] extractAssetUrls called on base class', { result });
        throw new Error('extractAssetUrls must be implemented by subclass');
    }

    generateFileName(index = 0) {
        const logger = require('../../utils/logger');
        logger.error('[SEVERE] generateFileName called on base class', { index });
        throw new Error('generateFileName must be implemented by subclass');
    }

    getAssetType() {
        const logger = require('../../utils/logger');
        logger.error('[SEVERE] getAssetType called on base class');
        throw new Error('getAssetType must be implemented by subclass');
    }

    validateModelSpecificInputs(modelId, input) {
        // Default implementation - can be overridden by subclasses
        const model = this.findModel(modelId);
        if (!model) {
            throw new Error(`Model ${modelId} not supported`);
        }
        // Always return a validation result object
        return { isValid: true, errors: [], warnings: [] };
    }
}

module.exports = BaseFalaiService; 