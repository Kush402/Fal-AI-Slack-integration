/**
 * @fileoverview Input validation and sanitization utilities
 * @description Provides comprehensive validation and sanitization for user inputs
 */

const logger = require('./logger');

/**
 * Sanitize string input
 */
function sanitizeString(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    return input
        .trim()
        .substring(0, maxLength)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/[<>]/g, '');
}

/**
 * Validate and sanitize brand name
 */
function validateBrandName(brandName) {
    if (!brandName || typeof brandName !== 'string') {
        return { isValid: false, error: 'Brand name is required' };
    }
    
    const sanitized = sanitizeString(brandName, 200);
    
    if (sanitized.length === 0) {
        return { isValid: false, error: 'Brand name cannot be empty' };
    }
    
    if (sanitized.length < 1) {
        return { isValid: false, error: 'Brand name must be at least 1 character' };
    }
    
    if (sanitized.length > 200) {
        return { isValid: false, error: 'Brand name must be less than 200 characters' };
    }
    
    return { isValid: true, value: sanitized };
}

/**
 * Validate and sanitize campaign data
 */
function validateCampaignData(campaignData) {
    const errors = [];
    const sanitized = {};
    
    // Validate client name
    const brandNameValidation = validateBrandName(campaignData?.clientName);
    if (!brandNameValidation.isValid) {
        errors.push(brandNameValidation.error);
    } else {
        sanitized.clientName = brandNameValidation.value;
    }
    
    // Sanitize other fields
    sanitized.campaignIdea = sanitizeString(campaignData?.campaignIdea || '', 1000);
    sanitized.creativeDirections = sanitizeString(campaignData?.creativeDirections || '', 1000);
    sanitized.visualDirections = sanitizeString(campaignData?.visualDirections || '', 1000);
    sanitized.industry = sanitizeString(campaignData?.industry || '', 200);
    sanitized.targetAudience = sanitizeString(campaignData?.targetAudience || '', 500);
    sanitized.competitors = sanitizeString(campaignData?.competitors || '', 500);
    sanitized.budget = sanitizeString(campaignData?.budget || '', 100);
    
    // Validate arrays
    if (campaignData?.brandValues && Array.isArray(campaignData.brandValues)) {
        sanitized.brandValues = campaignData.brandValues
            .filter(item => typeof item === 'string' && item.trim().length > 0)
            .map(item => sanitizeString(item, 200))
            .slice(0, 10); // Limit to 10 items
    } else {
        sanitized.brandValues = ['Not specified'];
    }
    
    if (campaignData?.businessGoals && Array.isArray(campaignData.businessGoals)) {
        sanitized.businessGoals = campaignData.businessGoals
            .filter(item => typeof item === 'string' && item.trim().length > 0)
            .map(item => sanitizeString(item, 200))
            .slice(0, 10); // Limit to 10 items
    } else {
        sanitized.businessGoals = ['Increase brand awareness'];
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        data: sanitized
    };
}

/**
 * Validate user ID
 */
function validateUserId(userId) {
    if (!userId || typeof userId !== 'string') {
        return { isValid: false, error: 'User ID is required' };
    }
    
    const sanitized = sanitizeString(userId, 100);
    
    if (sanitized.length === 0) {
        return { isValid: false, error: 'User ID cannot be empty' };
    }
    
    return { isValid: true, value: sanitized };
}

/**
 * Validate thread ID
 */
function validateThreadId(threadId) {
    if (!threadId || typeof threadId !== 'string') {
        return { isValid: false, error: 'Thread ID is required' };
    }
    
    const sanitized = sanitizeString(threadId, 100);
    
    if (sanitized.length === 0) {
        return { isValid: false, error: 'Thread ID cannot be empty' };
    }
    
    return { isValid: true, value: sanitized };
}

/**
 * Validate channel ID
 */
function validateChannelId(channelId) {
    if (!channelId || typeof channelId !== 'string') {
        return { isValid: false, error: 'Channel ID is required' };
    }
    
    const sanitized = sanitizeString(channelId, 100);
    
    if (sanitized.length === 0) {
        return { isValid: false, error: 'Channel ID cannot be empty' };
    }
    
    return { isValid: true, value: sanitized };
}

/**
 * Validate generation parameters
 */
function validateGenerationParameters(parameters) {
    if (!parameters || typeof parameters !== 'object') {
        return { isValid: false, error: 'Generation parameters are required' };
    }
    
    const errors = [];
    const sanitized = {};
    
    // Only validate modelId and operation here
    if (!parameters.modelId || typeof parameters.modelId !== 'string') {
        errors.push('Model ID is required');
    } else {
        sanitized.modelId = sanitizeString(parameters.modelId, 200);
        if (sanitized.modelId.length === 0) {
            errors.push('Model ID cannot be empty');
        }
    }
    
    if (!parameters.operation || typeof parameters.operation !== 'string') {
        errors.push('Operation is required');
    } else {
        sanitized.operation = sanitizeString(parameters.operation, 50);
        if (sanitized.operation.length === 0) {
            errors.push('Operation cannot be empty');
        }
    }
    
    // Sanitize optional fields
    sanitized.parameters = parameters.parameters || {};
    
    return {
        isValid: errors.length === 0,
        errors,
        data: sanitized
    };
}

/**
 * Log validation errors
 */
function logValidationErrors(errors, context = {}) {
    if (errors && errors.length > 0) {
        logger.warn('Input validation failed', {
            errors,
            context
        });
    }
}

module.exports = {
    sanitizeString,
    validateBrandName,
    validateCampaignData,
    validateUserId,
    validateThreadId,
    validateChannelId,
    validateGenerationParameters,
    logValidationErrors
}; 