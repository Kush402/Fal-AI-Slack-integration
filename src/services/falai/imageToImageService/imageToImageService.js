const BaseFalaiService = require('../BaseFalaiService');
const { fal } = require('@fal-ai/client');
const logger = require('../../../utils/logger');

class ImageToImageService extends BaseFalaiService {
    constructor() {
        // Define supported models first
        const supportedModels = [
            {
                id: 'fal-ai/image-editing/background-change',
                name: 'Background Change',
                description: 'Replace photo backgrounds with any scene while preserving the main subject.',
                params: ['image_url', 'prompt', 'guidance_scale', 'num_inference_steps', 'safety_tolerance', 'output_format', 'aspect_ratio', 'seed', 'sync_mode']
            },
            {
                id: 'fal-ai/image-editing/face-enhancement',
                name: 'Face Enhancement',
                description: 'Professional facial retouching with natural-looking enhancements.',
                params: ['image_url', 'guidance_scale', 'num_inference_steps', 'safety_tolerance', 'output_format', 'aspect_ratio', 'seed', 'sync_mode']
            },
            {
                id: 'fal-ai/image-editing/color-correction',
                name: 'Color Correction',
                description: 'Professional color grading and tone adjustment for consistent results.',
                params: ['image_url', 'guidance_scale', 'num_inference_steps', 'safety_tolerance', 'output_format', 'aspect_ratio', 'seed', 'sync_mode']
            },
            {
                id: 'fal-ai/post-processing/sharpen',
                name: 'Image Sharpening',
                description: 'Apply sharpening effects with three modes: basic, smart, and CAS.',
                params: ['image_url', 'sharpen_mode', 'sharpen_radius', 'sharpen_alpha', 'noise_radius', 'preserve_edges', 'smart_sharpen_strength', 'smart_sharpen_ratio', 'cas_amount']
            },
            {
                id: 'fal-ai/image-editing/object-removal',
                name: 'Object Removal',
                description: 'Remove unwanted objects from photos with seamless background reconstruction.',
                params: ['image_url', 'prompt', 'guidance_scale', 'num_inference_steps', 'safety_tolerance', 'output_format', 'aspect_ratio', 'seed', 'sync_mode']
            },
            {
                id: 'fal-ai/flux/dev/image-to-image',
                name: 'FLUX Dev Image-to-Image',
                description: 'High-quality image transformation with 12B parameter flow transformer.',
                params: ['image_url', 'prompt', 'strength', 'num_inference_steps', 'seed', 'guidance_scale', 'sync_mode', 'num_images', 'enable_safety_checker', 'output_format', 'acceleration']
            },
            {
                id: 'fal-ai/recraft/v3/image-to-image',
                name: 'Recraft V3 Image-to-Image',
                description: 'Advanced image editing with typography and vector art capabilities.',
                params: ['prompt', 'image_url', 'strength', 'style', 'colors', 'style_id', 'negative_prompt', 'sync_mode']
            },
            {
                id: 'fal-ai/luma-photon/modify',
                name: 'Luma Photon Modify',
                description: 'Creative, personalizable image editing with intelligent visual models.',
                params: ['prompt', 'image_url', 'strength', 'aspect_ratio']
            },
            {
                id: 'fal-ai/bytedance/seededit/v3/edit-image',
                name: 'ByteDance SeedEdit V3',
                description: 'Accurate image editing with precise content preservation.',
                params: ['prompt', 'image_url', 'guidance_scale', 'seed']
            },
            {
                id: 'fal-ai/flux-pro/kontext/max/multi',
                name: 'FLUX Pro Kontext Max Multi',
                description: 'Premium image editing with multiple image support and improved prompt adherence.',
                params: ['prompt', 'seed', 'guidance_scale', 'sync_mode', 'num_images', 'output_format', 'safety_tolerance', 'aspect_ratio', 'image_urls']
            }
        ];

        // Call parent constructor with service name and supported models
        super('imageToImage', supportedModels);
        
        // Store supported models for this service
        this.supportedModels = supportedModels;
    }

    // Map generic params to model-specific input
    mapParams(modelId, params) {
        // Model-specific parameter mapping based on actual API specs
        // ENFORCE output_format and sync_mode for all models
        const enforcedOutputFormat = params.output_format === 'png' ? 'png' : 'jpeg';
        const enforcedSyncMode = true;
        switch (modelId) {
            case 'fal-ai/image-editing/background-change':
                return {
                    image_url: params.image_url,
                    prompt: params.prompt || 'beach sunset with palm trees',
                    guidance_scale: params.guidance_scale || 3.5,
                    num_inference_steps: params.num_inference_steps || 30,
                    safety_tolerance: params.safety_tolerance || '2',
                    output_format: enforcedOutputFormat,
                    aspect_ratio: params.aspect_ratio,
                    seed: params.seed,
                    sync_mode: enforcedSyncMode
                };
            
            case 'fal-ai/image-editing/face-enhancement':
                return {
                    image_url: params.image_url,
                    guidance_scale: params.guidance_scale || 3.5,
                    num_inference_steps: params.num_inference_steps || 30,
                    safety_tolerance: params.safety_tolerance || '2',
                    output_format: enforcedOutputFormat,
                    aspect_ratio: params.aspect_ratio,
                    seed: params.seed,
                    sync_mode: enforcedSyncMode
                };
            
            case 'fal-ai/image-editing/color-correction':
                return {
                    image_url: params.image_url,
                    guidance_scale: params.guidance_scale || 3.5,
                    num_inference_steps: params.num_inference_steps || 30,
                    safety_tolerance: params.safety_tolerance || '2',
                    output_format: enforcedOutputFormat,
                    aspect_ratio: params.aspect_ratio,
                    seed: params.seed,
                    sync_mode: enforcedSyncMode
                };
            
            case 'fal-ai/post-processing/sharpen':
                return {
                    image_url: params.image_url,
                    sharpen_mode: params.sharpen_mode || 'basic',
                    sharpen_radius: params.sharpen_radius || 1,
                    sharpen_alpha: params.sharpen_alpha || 1,
                    noise_radius: params.noise_radius || 7,
                    preserve_edges: params.preserve_edges || 0.75,
                    smart_sharpen_strength: params.smart_sharpen_strength || 5,
                    smart_sharpen_ratio: params.smart_sharpen_ratio || 0.5,
                    cas_amount: params.cas_amount || 0.8,
                    output_format: enforcedOutputFormat,
                    sync_mode: enforcedSyncMode
                };
            
            case 'fal-ai/image-editing/object-removal':
                return {
                    image_url: params.image_url,
                    prompt: params.prompt || 'background people',
                    guidance_scale: params.guidance_scale || 3.5,
                    num_inference_steps: params.num_inference_steps || 30,
                    safety_tolerance: params.safety_tolerance || '2',
                    output_format: enforcedOutputFormat,
                    aspect_ratio: params.aspect_ratio,
                    seed: params.seed,
                    sync_mode: enforcedSyncMode
                };
            
            case 'fal-ai/flux/dev/image-to-image':
                return {
                    image_url: params.image_url,
                    prompt: params.prompt,
                    strength: params.strength || 0.95,
                    num_inference_steps: params.num_inference_steps || 40,
                    seed: params.seed,
                    guidance_scale: params.guidance_scale || 3.5,
                    sync_mode: enforcedSyncMode,
                    num_images: params.num_images || 1,
                    enable_safety_checker: params.enable_safety_checker !== false,
                    output_format: enforcedOutputFormat,
                    acceleration: params.acceleration || 'none'
                };
            
            case 'fal-ai/recraft/v3/image-to-image':
                return {
                    prompt: params.prompt,
                    image_url: params.image_url,
                    strength: params.strength || 0.5,
                    style: params.style || 'realistic_image',
                    colors: params.colors || [],
                    style_id: params.style_id,
                    negative_prompt: params.negative_prompt,
                    sync_mode: enforcedSyncMode,
                    output_format: enforcedOutputFormat
                };
            
            case 'fal-ai/luma-photon/modify':
                return {
                    prompt: params.prompt,
                    image_url: params.image_url,
                    strength: params.strength || 0.8,
                    aspect_ratio: params.aspect_ratio || '16:9',
                    sync_mode: enforcedSyncMode,
                    output_format: enforcedOutputFormat
                };
            
            case 'fal-ai/bytedance/seededit/v3/edit-image':
                return {
                    prompt: params.prompt,
                    image_url: params.image_url,
                    guidance_scale: params.guidance_scale || 0.5,
                    seed: params.seed,
                    sync_mode: enforcedSyncMode,
                    output_format: enforcedOutputFormat
                };
            
            case 'fal-ai/flux-pro/kontext/max/multi':
                return {
                    prompt: params.prompt,
                    seed: params.seed,
                    guidance_scale: params.guidance_scale || 3.5,
                    sync_mode: enforcedSyncMode,
                    num_images: params.num_images || 1,
                    output_format: enforcedOutputFormat,
                    safety_tolerance: params.safety_tolerance || '2',
                    aspect_ratio: params.aspect_ratio,
                    image_urls: params.image_urls || [params.image_url] // Convert single URL to array
                };
            
            default:
                // Fallback for unknown models
                return {
                    image_url: params.image_url,
                    prompt: params.prompt,
                    guidance_scale: params.guidance_scale || 3.5,
                    num_inference_steps: params.num_inference_steps || 30,
                    safety_tolerance: params.safety_tolerance || '2',
                    output_format: enforcedOutputFormat,
                    aspect_ratio: params.aspect_ratio,
                    seed: params.seed,
                    sync_mode: enforcedSyncMode
                };
        }
    }

    async generateContent({ modelId, params }) {
        // Enforce output_format and async mode
        const mappedParams = this.mapParams(modelId, params);
        mappedParams.output_format = mappedParams.output_format === 'png' ? 'png' : 'jpeg';
        mappedParams.sync_mode = false; // Always use async queue flow for hosted URLs

        // Use the imported fal client directly
        let requestId;
        try {
            const submitResult = await fal.queue.submit(modelId, {
                input: mappedParams
            });
            requestId = submitResult.request_id;
            if (!requestId) {
                throw new Error('fal.ai did not return a request_id for async queue submission.');
            }
        } catch (err) {
            throw new Error('Failed to submit image-to-image request to fal.ai: ' + err.message);
        }

        // Poll for completion (simple polling, can be improved with exponential backoff or webhooks)
        let status, pollCount = 0;
        const maxPolls = 30; // e.g., poll up to 30 times (about 30 seconds)
        const pollIntervalMs = 1000;
        while (pollCount < maxPolls) {
            try {
                status = await fal.queue.status(modelId, {
                    requestId,
                    logs: false
                });
                if (status.status === 'COMPLETED') break;
                if (status.status === 'FAILED' || status.status === 'CANCELLED') {
                    throw new Error(`fal.ai async request failed with status: ${status.status}`);
                }
            } catch (err) {
                throw new Error('Error polling fal.ai queue status: ' + err.message);
            }
            await new Promise(res => setTimeout(res, pollIntervalMs));
            pollCount++;
        }
        if (!status || status.status !== 'COMPLETED') {
            throw new Error('fal.ai async request did not complete in time.');
        }

        // Fetch the result
        let result;
        try {
            result = await fal.queue.result(modelId, { requestId });
            logger.debug(`[ImageToImageService] Full fal.ai result for model ${modelId}:`, JSON.stringify(result, null, 2));
        } catch (err) {
            throw new Error('Error fetching fal.ai async result: ' + err.message);
        }

        // Extract hosted URL from result
        let imageUrl = null;
        if (result && result.data && result.data.images && result.data.images[0] && result.data.images[0].url) {
            imageUrl = result.data.images[0].url;
        } else if (result && result.images && result.images[0] && result.images[0].url) {
            imageUrl = result.images[0].url;
        } else if (result && result.data && result.data.image && result.data.image.url) {
            imageUrl = result.data.image.url;
        }
        if (!imageUrl || !imageUrl.startsWith('http')) {
            throw new Error('fal.ai async result did not return a hosted URL. Only hosted URLs are supported.');
        }
        return { imageUrl };
    }

    /**
     * Get supported models for image-to-image operations
     * @returns {Array} Array of supported model configurations
     */
    getSupportedModels() {
        return this.supportedModels;
    }

    /**
     * Get model configuration by ID
     * @param {string} modelId - Model identifier
     * @returns {Object|null} Model configuration or null if not found
     */
    getModelConfig(modelId) {
        return this.supportedModels.find(model => model.id === modelId) || null;
    }

    /**
     * Validate model parameters
     * @param {string} modelId - Model identifier
     * @param {Object} params - Parameters to validate
     * @returns {Object} Validation result
     */
    validateParameters(modelId, params) {
        const modelConfig = this.getModelConfig(modelId);
        if (!modelConfig) {
            return { isValid: false, errors: [`Model ${modelId} not found`] };
        }

        const errors = [];
        const requiredParams = modelConfig.params;

        // Check required parameters
        if (!params.image_url && modelId !== 'fal-ai/flux-pro/kontext/max/multi') {
            errors.push('image_url is required');
        }

        // Special validation for multi-image model
        if (modelId === 'fal-ai/flux-pro/kontext/max/multi' && !params.image_urls && !params.image_url) {
            errors.push('image_urls or image_url is required');
        }

        // Validate parameter types and ranges
        if (params.guidance_scale && (params.guidance_scale < 0 || params.guidance_scale > 20)) {
            errors.push('guidance_scale must be between 0 and 20');
        }

        if (params.num_inference_steps && (params.num_inference_steps < 1 || params.num_inference_steps > 100)) {
            errors.push('num_inference_steps must be between 1 and 100');
        }

        if (params.safety_tolerance && ![1, 2, 3, 4, 5, 6].includes(parseInt(params.safety_tolerance))) {
            errors.push('safety_tolerance must be between 1 and 6');
        }

        if (params.strength && (params.strength < 0 || params.strength > 1)) {
            errors.push('strength must be between 0 and 1');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = ImageToImageService; 