/**
 * @fileoverview Centralized Validation Utilities
 * @description Provides standardized validation methods for all services
 */

const logger = require('./logger');

class ValidationUtils {
    /**
     * Validate image URL format
     * @param {string} url - URL to validate
     * @returns {boolean} Whether URL is valid
     */
    static isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Check for common image URL patterns
        const imageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        const dataUrlPattern = /^data:image\/(jpeg|png|gif|webp);base64,/i;
        
        return imageUrlPattern.test(url) || dataUrlPattern.test(url);
    }

    /**
     * Validate video URL format
     * @param {string} url - URL to validate
     * @returns {boolean} Whether URL is valid
     */
    static isValidVideoUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Check for common video URL patterns
        const videoUrlPattern = /^https?:\/\/.+\.(mp4|mov|avi|wmv|flv|webm|mkv)(\?.*)?$/i;
        const dataUrlPattern = /^data:video\/(mp4|mov|avi|wmv|flv|webm|mkv);base64,/i;
        
        return videoUrlPattern.test(url) || dataUrlPattern.test(url);
    }

    /**
     * Validate audio URL format
     * @param {string} url - URL to validate
     * @returns {boolean} Whether URL is valid
     */
    static isValidAudioUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Check for common audio URL patterns
        const audioUrlPattern = /^https?:\/\/.+\.(mp3|wav|aac|ogg|flac|m4a)(\?.*)?$/i;
        const dataUrlPattern = /^data:audio\/(mp3|wav|aac|ogg|flac|m4a);base64,/i;
        
        return audioUrlPattern.test(url) || dataUrlPattern.test(url);
    }

    /**
     * Validate prompt text
     * @param {string} prompt - Prompt to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validatePrompt(prompt, options = {}) {
        const logger = require('./logger');
        logger.error('[SEVERE] validatePrompt called', { prompt, options });
        
        const {
            minLength = 10,
            maxLength = 2000,
            allowEmpty = false,
            checkHarmful = true
        } = options;

        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Check if prompt exists
        if (!prompt || typeof prompt !== 'string') {
            logger.error('[SEVERE] Prompt validation failed - not a string', { prompt, promptType: typeof prompt });
            result.isValid = false;
            result.errors.push('Prompt must be a non-empty string');
            return result;
        }

        logger.error('[SEVERE] About to check prompt length', { prompt, promptLength: prompt.length, minLength, maxLength });

        // Check length
        if (prompt.length < minLength) {
            logger.error('[SEVERE] Prompt too short', { prompt, promptLength: prompt.length, minLength });
            result.isValid = false;
            result.errors.push(`Prompt is too short (minimum ${minLength} characters)`);
        }

        if (prompt.length > maxLength) {
            logger.error('[SEVERE] Prompt too long', { prompt, promptLength: prompt.length, maxLength });
            result.isValid = false;
            result.errors.push(`Prompt is too long (maximum ${maxLength} characters)`);
        }

        // Check for harmful content
        if (checkHarmful) {
            const harmfulPatterns = [
                /violence/i,
                /hate/i,
                /discrimination/i,
                /illegal/i,
                /offensive/i,
                /explicit/i
            ];

            for (const pattern of harmfulPatterns) {
                if (pattern.test(prompt)) {
                    result.warnings.push('Prompt may contain potentially harmful content');
                    break;
                }
            }
        }

        logger.error('[SEVERE] validatePrompt completed', { result });
        return result;
    }

    /**
     * Validate model parameters
     * @param {Object} parameters - Parameters to validate
     * @param {Object} schema - Validation schema
     * @returns {Object} Validation result
     */
    static validateModelParameters(parameters, schema) {
        const logger = require('./logger');
        logger.error('[SEVERE] validateModelParameters called', { parameters, schema });
        
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            cleaned: {}
        };

        if (!parameters || typeof parameters !== 'object') {
            logger.error('[SEVERE] Parameters validation failed - not an object', { parameters });
            result.isValid = false;
            result.errors.push('Parameters must be an object');
            return result;
        }

        logger.error('[SEVERE] Starting parameter validation loop', { 
            parameterKeys: Object.keys(parameters), 
            schemaKeys: Object.keys(schema) 
        });

        for (const [key, config] of Object.entries(schema)) {
            const value = parameters[key];
            logger.error('[SEVERE] Validating parameter', { key, value, config });
            
            // Skip if parameter is not provided and not required
            if (value === undefined || value === null) {
                logger.error('[SEVERE] Parameter is undefined/null', { key, required: config.required });
                if (config.required) {
                    result.isValid = false;
                    result.errors.push(`${key} is required`);
                }
                continue;
            }

            // Special handling for arrays with item schema
            if (config.type === 'array') {
                if (!Array.isArray(value)) {
                    result.isValid = false;
                    result.errors.push(`${key} must be an array`);
                    continue;
                }
                if (config.items && config.items.type === 'object' && config.items.properties) {
                    for (const [i, item] of value.entries()) {
                        if (typeof item !== 'object' || item === null) {
                            result.isValid = false;
                            result.errors.push(`${key}[${i}] must be an object`);
                            continue;
                        }
                        for (const [prop, propConfig] of Object.entries(config.items.properties)) {
                            if (item[prop] === undefined || item[prop] === null) {
                                result.isValid = false;
                                result.errors.push(`${key}[${i}].${prop} is required`);
                                continue;
                            }
                            if (propConfig.type === 'number') {
                                if (typeof item[prop] !== 'number') {
                                    result.isValid = false;
                                    result.errors.push(`${key}[${i}].${prop} must be a number`);
                                    continue;
                                }
                                if (propConfig.min !== undefined && item[prop] < propConfig.min) {
                                    result.isValid = false;
                                    result.errors.push(`${key}[${i}].${prop} must be at least ${propConfig.min}`);
                                }
                                if (propConfig.max !== undefined && item[prop] > propConfig.max) {
                                    result.isValid = false;
                                    result.errors.push(`${key}[${i}].${prop} must be at most ${propConfig.max}`);
                                }
                            }
                        }
                    }
                }
                // If no items schema, accept any array
                result.cleaned[key] = value;
                continue;
            }

            // Type validation
            if (config.type && typeof value !== config.type) {
                logger.error('[SEVERE] Type validation failed', { key, value, expectedType: config.type, actualType: typeof value });
                result.isValid = false;
                result.errors.push(`${key} must be of type ${config.type}`);
                continue;
            }

            // Range validation for numbers
            if (config.type === 'number') {
                if (config.min !== undefined && value < config.min) {
                    result.isValid = false;
                    result.errors.push(`${key} must be at least ${config.min}`);
                }
                if (config.max !== undefined && value > config.max) {
                    result.isValid = false;
                    result.errors.push(`${key} must be at most ${config.max}`);
                }
            }

            // Length validation for strings
            if (config.type === 'string') {
                logger.error('[SEVERE] String length validation', { key, value, valueType: typeof value });
                const valueLength = value ? value.length : 0;
                logger.error('[SEVERE] String length calculated', { key, valueLength });
                if (config.minLength !== undefined && valueLength < config.minLength) {
                    result.isValid = false;
                    result.errors.push(`${key} must be at least ${config.minLength} characters`);
                }
                if (config.maxLength !== undefined && valueLength > config.maxLength) {
                    result.isValid = false;
                    result.errors.push(`${key} must be at most ${config.maxLength} characters`);
                }
            }

            // Enum validation
            if (config.enum && !config.enum.includes(value)) {
                result.isValid = false;
                result.errors.push(`${key} must be one of: ${config.enum.join(', ')}`);
            }

            // Add to cleaned parameters if valid
            result.cleaned[key] = value;
        }

        logger.error('[SEVERE] validateModelParameters completed', { result });
        return result;
    }

    /**
     * Validate session parameters
     * @param {Object} session - Session object to validate
     * @returns {Object} Validation result
     */
    static validateSession(session) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!session || typeof session !== 'object') {
            result.isValid = false;
            result.errors.push('Session must be an object');
            return result;
        }

        // Check required fields
        const requiredFields = ['sessionId', 'userId'];
        for (const field of requiredFields) {
            if (!session[field]) {
                result.isValid = false;
                result.errors.push(`${field} is required`);
            }
        }

        // Validate sessionId format
        if (session.sessionId && typeof session.sessionId !== 'string') {
            result.isValid = false;
            result.errors.push('sessionId must be a string');
        }

        // Validate userId format
        if (session.userId && typeof session.userId !== 'string') {
            result.isValid = false;
            result.errors.push('userId must be a string');
        }

        return result;
    }

    /**
     * Validate file upload parameters
     * @param {Object} file - File object to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateFileUpload(file, options = {}) {
        const {
            maxSize = 10 * 1024 * 1024, // 10MB default
            allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            allowEmpty = false
        } = options;

        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!file && !allowEmpty) {
            result.isValid = false;
            result.errors.push('File is required');
            return result;
        }

        if (!file) {
            return result; // Empty file allowed
        }

        // Check file size
        if (file.size && file.size > maxSize) {
            result.isValid = false;
            result.errors.push(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
        }

        // Check file type
        if (file.mimetype && !allowedTypes.includes(file.mimetype)) {
            result.isValid = false;
            result.errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }

        return result;
    }

    /**
     * Validate API response format
     * @param {Object} response - Response object to validate
     * @param {Object} schema - Expected response schema
     * @returns {Object} Validation result
     */
    static validateApiResponse(response, schema) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (!response || typeof response !== 'object') {
            result.isValid = false;
            result.errors.push('Response must be an object');
            return result;
        }

        // Check required fields
        for (const [field, config] of Object.entries(schema)) {
            if (config.required && !(field in response)) {
                result.isValid = false;
                result.errors.push(`Response missing required field: ${field}`);
            }
        }

        return result;
    }

    /**
     * Sanitize input string
     * @param {string} input - Input to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} Sanitized string
     */
    static sanitizeString(input, options = {}) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        const {
            maxLength = 1000,
            removeHtml = true,
            removeScripts = true,
            trim = true
        } = options;

        let sanitized = input;

        // Remove HTML tags
        if (removeHtml) {
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }

        // Remove script tags and content
        if (removeScripts) {
            sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        }

        // Trim whitespace
        if (trim) {
            sanitized = sanitized.trim();
        }

        // Limit length
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized;
    }

    /**
     * Validate and normalize model ID
     * @param {string} modelId - Model ID to validate
     * @param {Array} allowedModels - List of allowed model IDs
     * @returns {Object} Validation result
     */
    static validateModelId(modelId, allowedModels = []) {
        const logger = require('./logger');
        logger.error('[SEVERE] validateModelId called', { modelId, allowedModels });
        
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            normalizedId: modelId
        };

        if (!modelId || typeof modelId !== 'string') {
            logger.error('[SEVERE] Model ID validation failed - not a string', { modelId, modelIdType: typeof modelId });
            result.isValid = false;
            result.errors.push('Model ID must be a non-empty string');
            return result;
        }

        logger.error('[SEVERE] About to check allowed models', { modelId, allowedModels, allowedModelsLength: allowedModels.length });

        // Check if model is in allowed list
        if (allowedModels.length > 0 && !allowedModels.includes(modelId)) {
            logger.error('[SEVERE] Model not in allowed list', { modelId, allowedModels });
            result.isValid = false;
            result.errors.push(`Model ${modelId} is not supported. Allowed models: ${allowedModels.join(', ')}`);
        }

        // Normalize model ID (remove extra spaces, convert to lowercase)
        result.normalizedId = modelId.trim().toLowerCase();

        logger.error('[SEVERE] validateModelId completed', { result });
        return result;
    }

    /**
     * Log validation errors
     * @param {Object} validationResult - Validation result object
     * @param {string} context - Context for logging
     */
    static logValidationErrors(validationResult, context = 'validation') {
        if (!validationResult || typeof validationResult !== 'object') return;
        const errors = Array.isArray(validationResult.errors) ? validationResult.errors : [];
        const warnings = Array.isArray(validationResult.warnings) ? validationResult.warnings : [];
        if (!validationResult.isValid) {
            logger.warn(`${context} validation failed`, {
                errors,
                warnings
            });
        } else if (warnings.length > 0) {
            logger.info(`${context} validation passed with warnings`, {
                warnings
            });
        }
    }
}

module.exports = ValidationUtils; 