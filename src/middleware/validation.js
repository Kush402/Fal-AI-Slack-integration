const Joi = require('joi');
const logger = require('../utils/logger');
const CursorRulesEngine = require('../utils/cursorRulesEngine');
const cursorRules = new CursorRulesEngine();

/**
 * Input validation middleware with security measures
 * Prevents injection attacks, validates content length, and sanitizes inputs
 */

// Common validation schemas
const schemas = {
    // User prompt validation - more flexible for creative content
    prompt: Joi.string()
        .min(1)
        .max(2000) // Prevent excessively long prompts
        .pattern(/^[\p{L}\p{N}\p{P}\p{Z}\p{S}]+$/u) // Allow Unicode letters, numbers, punctuation, spaces, symbols
        .trim()
        .required()
        .messages({
            'string.pattern.base': 'Prompt contains invalid characters. Please use letters, numbers, punctuation, and common symbols only.',
            'string.max': 'Prompt must be less than 2000 characters',
            'string.empty': 'Prompt is required'
        }),

    // Brand name validation
    brandName: Joi.string()
        .min(1)
        .max(100)
        .pattern(/^[a-zA-Z0-9\s\-_.&]+$/)
        .trim()
        .required(),

    // Model ID validation
    modelId: Joi.string()
        .pattern(/^[a-z0-9\-_\/]+$/) // Allow fal-ai/model-name format
        .max(100)
        .required(),

    // Operation validation
    operation: Joi.string()
        .valid('text-to-image', 'text-to-video', 'image-to-image', 'image-to-video', 
               'text-to-audio', 'text-to-speech', 'video-to-video', 'text-to-video')
        .required(),

    // Session ID validation
    sessionId: Joi.string()
        .uuid()
        .required(),

    // User ID validation (Slack user ID format)
    userId: Joi.string()
        .pattern(/^U[A-Z0-9]{8,}$/)
        .required(),

    // Thread ID validation
    threadId: Joi.string()
        .pattern(/^[A-Z0-9.]+$/)
        .max(50)
        .required(),

    // Generation parameters validation
    parameters: Joi.object({
        // Common parameters
        prompt: Joi.ref('$prompt'),
        negative_prompt: Joi.string().max(1000).allow(''),
        num_images: Joi.number().integer().min(1).max(4).default(1),
        seed: Joi.number().integer().min(0).max(2147483647),
        enable_safety_checker: Joi.boolean().default(true),
        output_format: Joi.string().valid('jpeg', 'png', 'webp').default('jpeg'),
        
        // Image size parameters
        image_size: Joi.string().valid(
            'square', 'square_hd', 'portrait', 'portrait_hd', 'landscape', 'landscape_hd',
            'square_4_3', 'landscape_4_3', 'portrait_4_3', '1:1', '16:9', '9:16', '4:3', '3:4'
        ),
        width: Joi.number().integer().min(256).max(2048),
        height: Joi.number().integer().min(256).max(2048),
        
        // Model-specific parameters
        num_inference_steps: Joi.number().integer().min(1).max(100),
        guidance_scale: Joi.number().min(0).max(20),
        text_guidance_scale: Joi.number().min(0).max(20),
        image_guidance_scale: Joi.number().min(0).max(20),
        
        // Video parameters
        duration: Joi.number().min(1).max(30),
        fps: Joi.number().integer().min(12).max(60),
        
        // Audio parameters
        sample_rate: Joi.number().integer().valid(16000, 22050, 44100, 48000),
        
        // File URLs (for image/video inputs)
        image_url: Joi.string().uri().max(500),
        video_url: Joi.string().uri().max(500),
    }).unknown(true) // Allow additional model-specific parameters
};

// Canonical brandData validation schema
const brandDataSchema = Joi.object({
    clientName: Joi.string().min(1).max(100).required(),
    campaignIdea: Joi.string().min(1).max(1000).required(),
    creativeDirections: Joi.string().max(1000).allow(''),
    visualDirections: Joi.string().max(1000).allow('')
}).required();

/**
 * Sanitize text input to prevent injection attacks
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return text;
    
    return text
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/data:/gi, '') // Remove data: URLs
        .replace(/vbscript:/gi, '') // Remove vbscript: URLs
        .trim();
}

/**
 * Validate session creation request
 */
const validateSessionCreation = (req, res, next) => {
    const schema = Joi.object({
        userId: schemas.userId,
        threadId: schemas.threadId,
        channelId: schemas.threadId.optional(), // Make channelId optional
        clientName: Joi.string().min(1).max(100).required(),
        campaignIdea: Joi.string().min(1).max(1000).required(),
        creativeDirections: Joi.string().max(1000).allow(''),
        visualDirections: Joi.string().max(1000).allow('')
    });

    const { error, value } = schema.validate(req.body);
    
    if (error) {
        logger.security('validation_error', 'Session creation validation failed', {
            error: error.details[0].message,
            userId: req.body.userId,
            path: req.path
        });
        
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: error.details[0].message
        });
    }

    // Sanitize text inputs
    value.clientName = sanitizeText(value.clientName);
    value.campaignIdea = sanitizeText(value.campaignIdea);
    value.creativeDirections = sanitizeText(value.creativeDirections);
    value.visualDirections = sanitizeText(value.visualDirections);

    req.body = value;
    next();
};

/**
 * Validate asset generation request
 */
const validateAssetGeneration = (req, res, next) => {
    const { parameters = {} } = req.body;
    const { operation, modelId } = parameters;
    let parametersSchema;

    if (operation === 'text-to-image') {
        parametersSchema = Joi.object({
            prompt: Joi.string().min(1).required(),
            negative_prompt: Joi.string().max(1000).allow('').default(''),
            num_images: Joi.number().integer().min(1).max(4).default(1),
            seed: Joi.number().integer().min(0).max(2147483647),
            enable_safety_checker: Joi.boolean().default(true),
            output_format: Joi.string().valid('jpeg', 'png', 'webp').default('jpeg'),
            image_size: Joi.string().valid(
                'square', 'square_hd', 'portrait', 'portrait_hd', 'landscape', 'landscape_hd',
                'square_4_3', 'landscape_4_3', 'portrait_4_3', '1:1', '16:9', '9:16', '4:3', '3:4'
            ),
            width: Joi.number().integer().min(256).max(2048),
            height: Joi.number().integer().min(256).max(2048),
            num_inference_steps: Joi.number().integer().min(1).max(100),
            guidance_scale: Joi.number().min(0).max(20),
            text_guidance_scale: Joi.number().min(0).max(20),
            image_guidance_scale: Joi.number().min(0).max(20),
            duration: Joi.number().min(1).max(30),
            fps: Joi.number().integer().min(12).max(60),
            sample_rate: Joi.number().integer().valid(16000, 22050, 44100, 48000),
            image_url: Joi.string().uri().max(500),
            video_url: Joi.string().uri().max(500)
        }).unknown(true);
    } else if (operation === 'text-to-audio') {
        // Model-specific validation
        const modelConfig = cursorRules.getModelConfig('text-to-audio', modelId);
        if (!modelConfig) {
            return res.status(400).json({ success: false, error: 'Invalid or missing modelId for text-to-audio' });
        }
        const paramDefs = modelConfig.parameters;
        const joiShape = {};
        for (const [param, def] of Object.entries(paramDefs)) {
            let joiParam;
            if (def.type === 'array') {
                if (def.items && def.items.type === 'object' && def.items.properties) {
                    // Build Joi.object() for each item
                    const itemShape = {};
                    for (const [prop, propDef] of Object.entries(def.items.properties)) {
                        let propJoi = Joi.any();
                        if (propDef.type === 'number') {
                            propJoi = Joi.number();
                            if (propDef.min !== undefined) propJoi = propJoi.min(propDef.min);
                            if (propDef.max !== undefined) propJoi = propJoi.max(propDef.max);
                            if (propDef.required) propJoi = propJoi.required();
                        } else if (propDef.type === 'string') {
                            propJoi = Joi.string();
                            if (propDef.required) propJoi = propJoi.required();
                        }
                        itemShape[prop] = propJoi;
                    }
                    joiParam = Joi.array().items(Joi.object(itemShape));
                } else {
                    joiParam = Joi.array().items(Joi.any());
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'string') {
                joiParam = Joi.string();
                if (def.options) {
                    joiParam = joiParam.valid(...def.options);
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
                if (def.max) joiParam = joiParam.max(def.max);
                if (def.min) joiParam = joiParam.min(def.min);
            } else if (def.type === 'number') {
                joiParam = Joi.number();
                if (def.min !== undefined) joiParam = joiParam.min(def.min);
                if (def.max !== undefined) joiParam = joiParam.max(def.max);
                if (def.required) {
                    joiParam = joiParam.required();
                } else {
                    joiParam = joiParam.allow('', null);
                }
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'boolean') {
                joiParam = Joi.boolean();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else {
                joiParam = Joi.any();
            }
            joiShape[param] = joiParam;
        }
        // Allow modelId and operation as known fields for routing
        joiShape.modelId = Joi.string();
        joiShape.operation = Joi.string();
        parametersSchema = Joi.object(joiShape).unknown(true);
    } else if (operation === 'text-to-video') {
        // Model-specific validation
        const modelConfig = cursorRules.getModelConfig('text-to-video', modelId);
        if (!modelConfig) {
            return res.status(400).json({ success: false, error: 'Invalid or missing modelId for text-to-video' });
        }
        const paramDefs = modelConfig.parameters;
        const joiShape = {};
        for (const [param, def] of Object.entries(paramDefs)) {
            let joiParam;
            if (def.type === 'array') {
                if (def.items && def.items.type === 'object' && def.items.properties) {
                    // Build Joi.object() for each item
                    const itemShape = {};
                    for (const [prop, propDef] of Object.entries(def.items.properties)) {
                        let propJoi = Joi.any();
                        if (propDef.type === 'number') {
                            propJoi = Joi.number();
                            if (propDef.min !== undefined) propJoi = propJoi.min(propDef.min);
                            if (propDef.max !== undefined) propJoi = propJoi.max(propDef.max);
                            if (propDef.required) propJoi = propJoi.required();
                        } else if (propDef.type === 'string') {
                            propJoi = Joi.string();
                            if (propDef.required) propJoi = propJoi.required();
                        }
                        itemShape[prop] = propJoi;
                    }
                    joiParam = Joi.array().items(Joi.object(itemShape));
                } else {
                    joiParam = Joi.array().items(Joi.any());
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'string') {
                joiParam = Joi.string();
                if (def.options) {
                    joiParam = joiParam.valid(...def.options);
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
                if (def.max) joiParam = joiParam.max(def.max);
                if (def.min) joiParam = joiParam.min(def.min);
            } else if (def.type === 'number') {
                joiParam = Joi.number();
                if (def.min !== undefined) joiParam = joiParam.min(def.min);
                if (def.max !== undefined) joiParam = joiParam.max(def.max);
                if (def.required) {
                    joiParam = joiParam.required();
                } else {
                    joiParam = joiParam.allow('', null);
                }
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'boolean') {
                joiParam = Joi.boolean();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else {
                joiParam = Joi.any();
            }
            joiShape[param] = joiParam;
        }
        // Allow modelId and operation as known fields for routing
        joiShape.modelId = Joi.string();
        joiShape.operation = Joi.string();
        parametersSchema = Joi.object(joiShape).unknown(true);
    } else if (operation === 'image-to-video') {
        // Model-specific validation
        const modelConfig = cursorRules.getModelConfig('image-to-video', modelId);
        if (!modelConfig) {
            return res.status(400).json({ success: false, error: 'Invalid or missing modelId for image-to-video' });
        }
        const paramDefs = modelConfig.parameters;
        const joiShape = {};
        for (const [param, def] of Object.entries(paramDefs)) {
            let joiParam;
            if (def.type === 'array') {
                if (def.items && def.items.type === 'object' && def.items.properties) {
                    // Build Joi.object() for each item
                    const itemShape = {};
                    for (const [prop, propDef] of Object.entries(def.items.properties)) {
                        let propJoi = Joi.any();
                        if (propDef.type === 'number') {
                            propJoi = Joi.number();
                            if (propDef.min !== undefined) propJoi = propJoi.min(propDef.min);
                            if (propDef.max !== undefined) propJoi = propJoi.max(propDef.max);
                            if (propDef.required) propJoi = propJoi.required();
                        } else if (propDef.type === 'string') {
                            propJoi = Joi.string();
                            if (propDef.required) propJoi = propJoi.required();
                        }
                        itemShape[prop] = propJoi;
                    }
                    joiParam = Joi.array().items(Joi.object(itemShape));
                } else {
                    joiParam = Joi.array().items(Joi.any());
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'string') {
                joiParam = Joi.string();
                if (def.options) {
                    joiParam = joiParam.valid(...def.options);
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
                if (def.max) joiParam = joiParam.max(def.max);
                if (def.min) joiParam = joiParam.min(def.min);
            } else if (def.type === 'number') {
                joiParam = Joi.number();
                if (def.min !== undefined) joiParam = joiParam.min(def.min);
                if (def.max !== undefined) joiParam = joiParam.max(def.max);
                if (def.required) {
                    joiParam = joiParam.required();
                } else {
                    joiParam = joiParam.allow('', null);
                }
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'boolean') {
                joiParam = Joi.boolean();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else {
                joiParam = Joi.any();
            }
            joiShape[param] = joiParam;
        }
        // Allow modelId and operation as known fields for routing
        joiShape.modelId = Joi.string();
        joiShape.operation = Joi.string();
        parametersSchema = Joi.object(joiShape).unknown(true);
    } else if (operation === 'video-to-video') {
        // Model-specific validation
        const modelConfig = cursorRules.getModelConfig('video-to-video', modelId);
        if (!modelConfig) {
            return res.status(400).json({ success: false, error: 'Invalid or missing modelId for video-to-video' });
        }
        const paramDefs = modelConfig.parameters;
        const joiShape = {};
        for (const [param, def] of Object.entries(paramDefs)) {
            let joiParam;
            if (def.type === 'array') {
                if (def.items && def.items.type === 'object' && def.items.properties) {
                    // Build Joi.object() for each item
                    const itemShape = {};
                    for (const [prop, propDef] of Object.entries(def.items.properties)) {
                        let propJoi = Joi.any();
                        if (propDef.type === 'number') {
                            propJoi = Joi.number();
                            if (propDef.min !== undefined) propJoi = propJoi.min(propDef.min);
                            if (propDef.max !== undefined) propJoi = propJoi.max(propDef.max);
                            if (propDef.required) propJoi = propJoi.required();
                        } else if (propDef.type === 'string') {
                            propJoi = Joi.string();
                            if (propDef.required) propJoi = propJoi.required();
                        }
                        itemShape[prop] = propJoi;
                    }
                    joiParam = Joi.array().items(Joi.object(itemShape));
                } else {
                    joiParam = Joi.array().items(Joi.any());
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'string') {
                joiParam = Joi.string();
                if (def.options) {
                    joiParam = joiParam.valid(...def.options);
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
                if (def.max) joiParam = joiParam.max(def.max);
                if (def.min) joiParam = joiParam.min(def.min);
            } else if (def.type === 'number') {
                joiParam = Joi.number();
                if (def.min !== undefined) joiParam = joiParam.min(def.min);
                if (def.max !== undefined) joiParam = joiParam.max(def.max);
                if (def.required) {
                    joiParam = joiParam.required();
                } else {
                    joiParam = joiParam.allow('', null);
                }
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'boolean') {
                joiParam = Joi.boolean();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else {
                joiParam = Joi.any();
            }
            joiShape[param] = joiParam;
        }
        // Allow modelId and operation as known fields for routing
        joiShape.modelId = Joi.string();
        joiShape.operation = Joi.string();
        parametersSchema = Joi.object(joiShape).unknown(true);
    } else if (operation === 'text-to-speech') {
        // Model-specific validation
        const modelConfig = cursorRules.getModelConfig('text-to-speech', modelId);
        if (!modelConfig) {
            return res.status(400).json({ success: false, error: 'Invalid or missing modelId for text-to-speech' });
        }
        const paramDefs = modelConfig.parameters;
        const joiShape = {};
        for (const [param, def] of Object.entries(paramDefs)) {
            let joiParam;
            if (param === 'text') {
                joiParam = Joi.string().min(1).max(2000).required();
            } else if (def.type === 'array') {
                if (def.items && def.items.type === 'object' && def.items.properties) {
                    // Build Joi.object() for each item
                    const itemShape = {};
                    for (const [prop, propDef] of Object.entries(def.items.properties)) {
                        let propJoi = Joi.any();
                        if (propDef.type === 'number') {
                            propJoi = Joi.number();
                            if (propDef.min !== undefined) propJoi = propJoi.min(propDef.min);
                            if (propDef.max !== undefined) propJoi = propJoi.max(propDef.max);
                            if (propDef.required) propJoi = propJoi.required();
                        } else if (propDef.type === 'string') {
                            propJoi = Joi.string();
                            if (propDef.required) propJoi = propJoi.required();
                        }
                        itemShape[prop] = propJoi;
                    }
                    joiParam = Joi.array().items(Joi.object(itemShape));
                } else {
                    joiParam = Joi.array().items(Joi.any());
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'string') {
                joiParam = Joi.string();
                if (def.options) {
                    joiParam = joiParam.valid(...def.options);
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'number') {
                joiParam = Joi.number();
                if (def.min !== undefined) joiParam = joiParam.min(def.min);
                if (def.max !== undefined) joiParam = joiParam.max(def.max);
                if (def.required) {
                    joiParam = joiParam.required();
                } else {
                    joiParam = joiParam.allow('', null);
                }
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'boolean') {
                joiParam = Joi.boolean();
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            }
            joiShape[param] = joiParam;
        }
        // Allow modelId and operation as known fields for routing
        joiShape.modelId = Joi.string();
        joiShape.operation = Joi.string();
        const schema = Joi.object(joiShape);
        const { error, value } = schema.validate(parameters);
        if (error) {
            return res.status(400).json({ success: false, error: 'Validation failed', details: error.message });
        }
        req.validatedParameters = value;
        return next();
    } else if (operation === 'image-to-image') {
        // Model-specific validation
        const modelConfig = cursorRules.getModelConfig('image-to-image', modelId);
        if (!modelConfig) {
            return res.status(400).json({ success: false, error: 'Invalid or missing modelId for image-to-image' });
        }
        const paramDefs = modelConfig.parameters;
        const joiShape = {};
        for (const [param, def] of Object.entries(paramDefs)) {
            let joiParam;
            if (param === 'image_url') {
                joiParam = Joi.string().uri().required();
            } else if (param === 'prompt') {
                joiParam = Joi.string().min(1).max(2000);
                if (def.required) joiParam = joiParam.required();
            } else if (def.type === 'array') {
                if (def.items && def.items.type === 'object' && def.items.properties) {
                    // Build Joi.object() for each item
                    const itemShape = {};
                    for (const [prop, propDef] of Object.entries(def.items.properties)) {
                        let propJoi = Joi.any();
                        if (propDef.type === 'number') {
                            propJoi = Joi.number();
                            if (propDef.min !== undefined) propJoi = propJoi.min(propDef.min);
                            if (propDef.max !== undefined) propJoi = propJoi.max(propDef.max);
                            if (propDef.required) propJoi = propJoi.required();
                        } else if (propDef.type === 'string') {
                            propJoi = Joi.string();
                            if (propDef.required) propJoi = propJoi.required();
                        }
                        itemShape[prop] = propJoi;
                    }
                    joiParam = Joi.array().items(Joi.object(itemShape));
                } else {
                    joiParam = Joi.array().items(Joi.any());
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'string') {
                joiParam = Joi.string();
                if (def.options) {
                    joiParam = joiParam.valid(...def.options);
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'number') {
                joiParam = Joi.number();
                if (def.min !== undefined) joiParam = joiParam.min(def.min);
                if (def.max !== undefined) joiParam = joiParam.max(def.max);
                if (def.required) {
                    joiParam = joiParam.required();
                } else {
                    joiParam = joiParam.allow('', null);
                }
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'boolean') {
                joiParam = Joi.boolean();
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            }
            joiShape[param] = joiParam;
        }
        // Allow modelId and operation as known fields for routing
        joiShape.modelId = Joi.string();
        joiShape.operation = Joi.string();
        const schema = Joi.object(joiShape);
        const { error, value } = schema.validate(parameters);
        if (error) {
            return res.status(400).json({ success: false, error: 'Validation failed', details: error.message });
        }
        req.validatedParameters = value;
        return next();
    } else if (operation === 'image-to-3d') {
        // Model-specific validation
        const modelConfig = cursorRules.getModelConfig('image-to-3d', modelId);
        if (!modelConfig) {
            return res.status(400).json({ success: false, error: 'Invalid or missing modelId for image-to-3d' });
        }
        const paramDefs = modelConfig.parameters;
        const joiShape = {};
        for (const [param, def] of Object.entries(paramDefs)) {
            let joiParam;
            if (def.type === 'array') {
                joiParam = Joi.array().items(Joi.any());
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'string') {
                joiParam = Joi.string();
                if (def.options) {
                    joiParam = joiParam.valid(...def.options);
                }
                if (def.required) joiParam = joiParam.required();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
                if (def.max) joiParam = joiParam.max(def.max);
                if (def.min) joiParam = joiParam.min(def.min);
            } else if (def.type === 'number') {
                joiParam = Joi.number();
                if (def.min !== undefined) joiParam = joiParam.min(def.min);
                if (def.max !== undefined) joiParam = joiParam.max(def.max);
                if (def.required) {
                    joiParam = joiParam.required();
                } else {
                    joiParam = joiParam.allow('', null);
                }
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else if (def.type === 'boolean') {
                joiParam = Joi.boolean();
                if (def.default !== undefined) joiParam = joiParam.default(def.default);
            } else {
                joiParam = Joi.any();
            }
            joiShape[param] = joiParam;
        }
        joiShape.modelId = Joi.string();
        joiShape.operation = Joi.string();
        parametersSchema = Joi.object(joiShape).unknown(true);
    } else {
        return res.status(400).json({ success: false, error: 'Unsupported operation' });
    }

    const schema = Joi.object({
        userId: schemas.userId,
        threadId: schemas.threadId,
        generationId: Joi.string().uuid().required(),
        parameters: parametersSchema.required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: error.message });
    }
    next();
};

/**
 * Rate limiting validation middleware
 */
const validateRateLimit = (req, res, next) => {
    const userId = req.body.userId || req.params.userId;
    
    if (!userId) {
        logger.security('rate_limit_error', 'Missing user ID for rate limiting', {
            path: req.path,
            ip: req.ip
        });
        
        return res.status(400).json({
            success: false,
            error: 'User identification required'
        });
    }

    // Add user ID to request for rate limiting middleware
    req.rateLimitKey = userId;
    next();
};

/**
 * General parameter validation for specific operations
 */
const validateOperationParameters = (operation) => {
    return (req, res, next) => {
        const parameters = req.body.parameters || {};
        
        // Operation-specific validations
        switch (operation) {
            case 'text-to-image':
                if (!parameters.prompt || parameters.prompt.length < 3) {
                    return res.status(400).json({
                        success: false,
                        error: 'Prompt must be at least 3 characters long'
                    });
                }
                break;
                
            case 'text-to-video':
                if (!parameters.prompt || parameters.prompt.length < 5) {
                    return res.status(400).json({
                        success: false,
                        error: 'Video prompt must be at least 5 characters long'
                    });
                }
                break;
                
            case 'image-to-image':
            case 'image-to-video':
                if (!parameters.image_url && !parameters.image) {
                    return res.status(400).json({
                        success: false,
                        error: 'Image input is required for this operation'
                    });
                }
                break;
        }
        
        next();
    };
};

module.exports = {
    validateSessionCreation,
    validateAssetGeneration,
    validateRateLimit,
    validateOperationParameters,
    sanitizeText,
    schemas
}; 