/**
 * @fileoverview Cursor Rules Engine - Interprets cursor.rules to drive workflow logic
 * @description This engine parses cursor.rules configuration and manages workflow states,
 * transitions, and business logic for the Slack AI Asset Generator.
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { getModelPricing, formatPricing } = require('../config/modelPricing');
const videoToVideoModalParams = require('../services/falai/videoToVideoService/videoToVideoModalParams');
const videoToVideoModelMeta = {
    'fal-ai/luma-dream-machine/ray-2/modify': {
        name: 'Ray2 Modify Video',
        description: 'Ray2 Modify is a video generative model capable of restyling or retexturing the entire shot.'
    },
    'fal-ai/wan-vace-14b': {
        name: 'Wan VACE 14B',
        description: 'Endpoint for inpainting a video from all supported sources.'
    },
    'fal-ai/ltx-video-13b-distilled/multiconditioning': {
        name: 'LTX Video 13B Multiconditioning',
        description: 'Generate a video from a prompt and any number of images and video.'
    },
    'fal-ai/magi/extend-video': {
        name: 'Magi Extend Video',
        description: 'Generate a video extension.'
    },
    'fal-ai/pixverse/lipsync': {
        name: 'Pixverse Lipsync',
        description: 'Create a lipsync video by combining a video with audio.'
    },
    'fal-ai/pixverse/extend/fast': {
        name: 'Pixverse Extend Fast',
        description: 'Extend a video by generating new content based on its ending using fast mode.'
    },
    'fal-ai/fast-animatediff/turbo/video-to-video': {
        name: 'Fast AnimateDiff Turbo Video-to-Video',
        description: 'Turbo Video To Video.'
    },
    'fal-ai/video-upscaler': {
        name: 'Video Upscaler',
        description: 'Upscale a video.'
    },
    'fal-ai/amt-interpolation': {
        name: 'AMT Interpolation',
        description: 'Interpolate video frames.'
    },
    'fal-ai/ffmpeg-api/merge-audio-video': {
        name: 'FFmpeg Merge Audio Video',
        description: 'Combine video and audio into a single file.'
    }
};

class CursorRulesEngine {
    constructor() {
        this.rules = this.loadCursorRules();
        this.workflowStates = this.initializeWorkflowStates();
        this.operations = this.initializeOperations();
        this.models = this.initializeModels();
    }

    /**
     * Load cursor.rules configuration
     * @returns {Object} Parsed rules configuration
     */
    loadCursorRules() {
        try {
            const rulesPath = path.join(process.cwd(), 'cursor.rules');
            const rulesContent = fs.readFileSync(rulesPath, 'utf8');
            
            // Parse the rules content (assuming it's in a structured format)
            // For now, we'll use a simplified parser
            const rules = this.parseRulesContent(rulesContent);
            
            logger.info('Cursor Rules Engine: Loaded cursor.rules successfully');
            return rules;
        } catch (error) {
            logger.error('Cursor Rules Engine: Failed to load cursor.rules', error);
            // Return default rules if file not found
            return this.getDefaultRules();
        }
    }

    /**
     * Parse rules content from cursor.rules file
     * @param {string} content - File content
     * @returns {Object} Parsed rules
     */
    parseRulesContent(content) {
        // Simple parser for cursor.rules format
        const rules = {
            project: {},
            workflow: {},
            rules: {},
            roadmap: []
        };

        const lines = content.split('\n');
        let currentSection = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('project:')) {
                currentSection = 'project';
            } else if (trimmedLine.startsWith('workflow:')) {
                currentSection = 'workflow';
            } else if (trimmedLine.startsWith('rules:')) {
                currentSection = 'rules';
            } else if (trimmedLine.startsWith('roadmap:')) {
                currentSection = 'roadmap';
            } else if (trimmedLine.startsWith('  - [x]')) {
                rules.roadmap.push({
                    task: trimmedLine.substring(6).trim(),
                    completed: true
                });
            } else if (trimmedLine.startsWith('  - [ ]')) {
                rules.roadmap.push({
                    task: trimmedLine.substring(6).trim(),
                    completed: false
                });
            }
        }

        return rules;
    }

    /**
     * Get default rules if cursor.rules not found
     * @returns {Object} Default rules configuration
     */
    getDefaultRules() {
        return {
            project: {
                name: 'Slack AI Asset Generator',
                description: 'A Slack-integrated AI dashboard bot for generating marketing and creative assets'
            },
            workflow: {
                steps: [
                    'User triggers bot via Slack message or slash command',
                    'Bot asks for campaign idea and stores session',
                    'User selects asset type (e.g., video-to-video)',
                    'Bot lists compatible fal.ai models with descriptions',
                    'User selects model + customizes advanced settings',
                    'MCP combines all into enhanced generation prompt',
                    'Job submitted to fal.ai API',
                    'MCP polls job status until completion',
                    'Asset uploaded to session-specific Google Drive folder',
                    'Slack thread updated with final output + regen/edit options'
                ]
            },
            rules: {
                api: [
                    '/start-session',
                    '/select-operation',
                    '/list-models',
                    '/submit-generation',
                    '/poll-status',
                    '/store-result',
                    '/regen',
                    '/edit',
                    '/upscale'
                ]
            },
            roadmap: [
                { task: 'Slack bot scaffolded with Bolt', completed: true },
                { task: 'Campaign context captured and Gemini-enhanced', completed: true },
                { task: 'Operation and model selector implemented', completed: true },
                { task: 'Fal.ai job submission + polling', completed: true },
                { task: 'Drive upload and Slack notification complete', completed: true },
                { task: 'Web dashboard for viewing all sessions', completed: false },
                { task: 'Session regen + versioning', completed: false },
                { task: 'Prompt tuning presets per campaign type', completed: false },
                { task: 'Slack message summarizer (Gemini)', completed: false }
            ]
        };
    }

    /**
     * Initialize workflow states
     * @returns {Object} Workflow states configuration
     */
    initializeWorkflowStates() {
        return {
            INITIALIZING: {
                name: 'Initializing',
                description: 'Session is being initialized',
                allowedTransitions: ['WAITING_FOR_CAMPAIGN', 'ERROR'],
                progress: 0
            },
            WAITING_FOR_CAMPAIGN: {
                name: 'Waiting for Campaign',
                description: 'Waiting for user to provide campaign idea',
                allowedTransitions: ['SELECTING_OPERATION', 'ERROR'],
                progress: 10
            },
            SELECTING_OPERATION: {
                name: 'Selecting Operation',
                description: 'User selecting asset generation operation',
                allowedTransitions: ['SELECTING_MODEL', 'ERROR'],
                progress: 30
            },
            SELECTING_MODEL: {
                name: 'Selecting Model',
                description: 'User selecting specific fal.ai model',
                allowedTransitions: ['CONFIGURING_PARAMETERS', 'ERROR'],
                progress: 40
            },
            CONFIGURING_PARAMETERS: {
                name: 'Configuring Parameters',
                description: 'User configuring model parameters',
                allowedTransitions: ['GENERATING_ASSET', 'ERROR'],
                progress: 50
            },
            GENERATING_ASSET: {
                name: 'Generating Asset',
                description: 'Asset generation in progress',
                allowedTransitions: ['UPLOADING_ASSET', 'ERROR'],
                progress: 70
            },
            UPLOADING_ASSET: {
                name: 'Uploading Asset',
                description: 'Uploading generated asset to Google Drive',
                allowedTransitions: ['COMPLETED', 'ERROR'],
                progress: 90
            },
            COMPLETED: {
                name: 'Completed',
                description: 'Asset generation completed successfully',
                allowedTransitions: ['WAITING_FOR_CAMPAIGN'],
                progress: 100
            },
            ERROR: {
                name: 'Error',
                description: 'An error occurred during the process',
                allowedTransitions: ['WAITING_FOR_CAMPAIGN'],
                progress: 0
            }
        };
    }

    /**
     * Initialize available operations
     * @returns {Object} Operations configuration
     */
    initializeOperations() {
        return {
            'text-to-image': {
                name: 'Text to Image',
                description: 'Generate images from text',
                models: [
                    'fal-ai/hidream-i1-full',
                    'fal-ai/ideogram/v2',
                    'fal-ai/stable-diffusion-v35-large',
                    'fal-ai/omnigen-v2',
                    'fal-ai/imagen4/preview',
                    'fal-ai/hidream-i1-fast',
                    'fal-ai/flux-1/schnell',
                    'fal-ai/imagen4/preview/fast',
                    'fal-ai/recraft/v2/text-to-image',
                    'fal-ai/f-lite/standard'
                ],
                parameters: [
                    'prompt',
                    'negative_prompt',
                    'image_size',
                    'num_inference_steps',
                    'seed',
                    'guidance_scale',
                    'num_images',
                    'enable_safety_checker',
                    'output_format',
                    'loras',
                    'aspect_ratio',
                    'expand_prompt',
                    'style',
                    'colors',
                    'style_id',
                    'controlnet',
                    'ip_adapter'
                ]
            },
            'text-to-video': {
                name: 'Text to Video',
                description: 'Generate videos from text prompts with multiple high-quality models',
                models: [
                    'fal-ai/kling-video/v2/master/text-to-video',
                    'fal-ai/bytedance/seedance/v1/pro/text-to-video',
                    'fal-ai/pixverse/v4/text-to-video/fast',
                    'fal-ai/pixverse/v4.5/text-to-video',
                    'fal-ai/wan-pro/text-to-video',
                    'fal-ai/luma-dream-machine/ray-2-flash',
                    'fal-ai/pika/v2.2/text-to-video',
                    'fal-ai/minimax/hailuo-02/standard/text-to-video',
                    'fal-ai/veo3',
                    'fal-ai/veo2' // Added new model
                ],
                parameters: [
                    'prompt',
                    'duration',
                    'aspect_ratio',
                    'negative_prompt',
                    'cfg_scale',
                    'resolution',
                    'camera_fixed',
                    'seed',
                    'style',
                    'loop',
                    'enable_safety_checker',
                    'prompt_optimizer',
                    'enhance_prompt',
                    'generate_audio'
                ]
            },
            'image-to-video': {
                name: 'Image to Video',
                description: 'Generate videos from a single input image and text prompt',
                models: [
                    'fal-ai/veo2/image-to-video',
                    'fal-ai/wan-pro/image-to-video',
                    'fal-ai/kling-video/v2.1/standard/image-to-video',
                    'fal-ai/bytedance/seedance/v1/lite/image-to-video',
                    'fal-ai/minimax/hailuo-02/pro/image-to-video',
                    'fal-ai/wan-i2v',
                    'fal-ai/pixverse/v4.5/image-to-video',
                    'fal-ai/luma-dream-machine/ray-2-flash/image-to-video',
                    'fal-ai/magi-distilled/image-to-video'
                ],
                parameters: [
                    // This will be model-specific, handled in initializeModels
                ]
            },
            'text-to-audio': {
                name: 'Text to Audio',
                description: 'Generate music/audio from text prompts',
                models: [
                    'fal-ai/lyria2',
                    'fal-ai/ace-step',
                    'CassetteAI/music-generator',
                    'fal-ai/ace-step/prompt-to-audio',
                    'cassetteai/sound-effects-generator',
                    'fal-ai/diffrhythm',
                    'fal-ai/elevenlabs/sound-effects',
                    'fal-ai/yue',
                    'fal-ai/mmaudio-v2/text-to-audio',
                    'fal-ai/minimax-music'
                ],
                parameters: [
                    // Parameters are model-specific, handled in initializeModels
                ]
            },
            'text-to-speech': {
                name: 'Text to Speech',
                description: 'Convert text to speech using a variety of TTS models',
                models: [
                    'resemble-ai/chatterboxhd/text-to-speech',
                    'fal-ai/orpheus-tts',
                    'fal-ai/minimax/speech-02-hd',
                    'fal-ai/dia-tts',
                    'fal-ai/minimax/voice-clone',
                    'fal-ai/playai/tts/v3',
                    'fal-ai/elevenlabs/tts/turbo-v2.5',
                    'fal-ai/minimax/speech-02-turbo',
                    'fal-ai/chatterbox/text-to-speech'
                ],
                parameters: [] // Model-specific, handled in initializeModels
            },
            'image-to-image': {
                name: 'Image to Image',
                description: 'Transform and edit existing images using AI models',
                models: [
                    'fal-ai/image-editing/background-change',
                    'fal-ai/image-editing/face-enhancement',
                    'fal-ai/image-editing/color-correction',
                    'fal-ai/post-processing/sharpen',
                    'fal-ai/image-editing/object-removal',
                    'fal-ai/flux/dev/image-to-image',
                    'fal-ai/recraft/v3/image-to-image',
                    'fal-ai/luma-photon/modify',
                    'fal-ai/bytedance/seededit/v3/edit-image',
                    'fal-ai/flux-pro/kontext/max/multi'
                ],
                parameters: [] // Model-specific, handled in initializeModels
            },
            'video-to-video': {
                name: 'Video to Video',
                description: 'Modify or restyle videos using advanced generative models',
                models: [
                    'fal-ai/luma-dream-machine/ray-2/modify',
                    'fal-ai/wan-vace-14b',
                    'fal-ai/ltx-video-13b-distilled/multiconditioning',
                    'fal-ai/magi/extend-video',
                    'fal-ai/pixverse/lipsync',
                    'fal-ai/pixverse/extend/fast',
                    'fal-ai/fast-animatediff/turbo/video-to-video',
                    'fal-ai/video-upscaler',
                    'fal-ai/amt-interpolation',
                    'fal-ai/ffmpeg-api/merge-audio-video'
                ],
                parameters: [] // Model-specific, handled in initializeModels
            },
            'image-to-3d': {
                name: 'Image to 3D',
                description: 'Generate a 3D model from a single image',
                models: [
                    'tripo3d/tripo/v2.5/image-to-3d',
                    'fal-ai/hunyuan3d-v21',
                    'fal-ai/hyper3d/rodin',
                    'fal-ai/trellis',
                    'tripo3d/tripo/v2.5/multiview-to-3d',
                    'fal-ai/hunyuan3d/v2/multi-view',
                    'fal-ai/trellis/multi',
                    'fal-ai/hunyuan3d/v2',
                    'fal-ai/hunyuan3d/v2/turbo',
                    'fal-ai/triposr'
                ],
                parameters: [
                    'image_url', 'input_image_url', 'input_image_urls', 'front_image_url', 'seed', 'face_limit', 'pbr', 'texture', 'texture_seed',
                    'auto_size', 'style', 'quad', 'texture_alignment', 'orientation', 'num_inference_steps', 'guidance_scale', 'octree_resolution', 'textured_mesh',
                    'prompt', 'condition_mode', 'geometry_file_format', 'material', 'quality', 'use_hyper', 'tier', 'TAPose', 'bbox_condition', 'addons',
                    'ss_guidance_strength', 'ss_sampling_steps', 'slat_guidance_strength', 'slat_sampling_steps', 'mesh_simplify', 'texture_size',
                    'left_image_url', 'back_image_url', 'right_image_url', 'image_urls', 'multiimage_algo', 'output_format', 'do_remove_background', 'foreground_ratio', 'mc_resolution'
                ]
            },
        };
    }

    /**
     * Initialize available models
     * @returns {Object} Models configuration
     */
    initializeModels() {
        const models = {
            'fal-ai/hidream-i1-full': {
                name: 'HiDream-I1 Full',
                description: 'SOTA image quality, 17B params, fast',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: '' },
                    image_size: { type: 'string', options: ['square_hd', 'landscape_4_3', 'portrait_4_3'], default: 'square_hd' },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 50 },
                    seed: { type: 'number', required: false },
                    guidance_scale: { type: 'number', min: 1, max: 20, default: 5 },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    enable_safety_checker: { type: 'boolean', default: true },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' }
                }
            },
            'fal-ai/ideogram/v2': {
                name: 'Ideogram V2',
                description: 'Exceptional typography, realistic outputs, commercial/creative use',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['1:1', '16:9', '9:16', '4:3', '3:4'], default: '1:1' },
                    expand_prompt: { type: 'boolean', default: true },
                    style: { type: 'string', options: ['auto', 'cinematic', 'photographic', 'anime', 'digital-art'], default: 'auto' },
                    seed: { type: 'number', required: false },
                    negative_prompt: { type: 'string', required: false, default: '' }
                }
            },
            'fal-ai/stable-diffusion-v35-large': {
                name: 'Stable Diffusion 3.5 Large',
                description: 'Multimodal, high quality, resource-efficient',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: '' },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 28 },
                    seed: { type: 'number', required: false },
                    guidance_scale: { type: 'number', min: 1, max: 20, default: 3.5 },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    enable_safety_checker: { type: 'boolean', default: true },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' },
                    image_size: { type: 'string', options: ['square_hd', 'landscape_4_3', 'portrait_4_3'], default: 'landscape_4_3' }
                }
            },
            'fal-ai/omnigen-v2': {
                name: 'OmniGen V2',
                description: 'Unified, multi-modal, editing, try-on, multi-person',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: '(((deformed))), blurry, over saturation, bad anatomy, disfigured, poorly drawn face, mutation, mutated, (extra_limb), (ugly), (poorly drawn hands), fused fingers, messy drawing, broken legs censor, censored, censor_bar' },
                    image_size: { type: 'string', options: ['square_hd', 'landscape_4_3', 'portrait_4_3'], default: 'square_hd' },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 50 },
                    seed: { type: 'number', required: false },
                    text_guidance_scale: { type: 'number', min: 1, max: 20, default: 5 },
                    image_guidance_scale: { type: 'number', min: 1, max: 20, default: 2 },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    enable_safety_checker: { type: 'boolean', default: true },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' }
                }
            },
            'fal-ai/imagen4/preview': {
                name: 'Imagen 4 Preview',
                description: 'Google\'s highest quality image generation model',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: '' },
                    aspect_ratio: { type: 'string', options: ['1:1', '16:9', '9:16', '4:3', '3:4'], default: '1:1' },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/hidream-i1-fast': {
                name: 'HiDream-I1 Fast',
                description: 'SOTA quality in 16 steps, optimized for speed/cost',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: '' },
                    image_size: { type: 'string', options: ['square_hd', 'landscape_4_3', 'portrait_4_3'], default: 'square_hd' },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 16 },
                    seed: { type: 'number', required: false },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    enable_safety_checker: { type: 'boolean', default: true },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' }
                }
            },
            'fal-ai/flux-1/schnell': {
                name: 'FLUX.1 Schnell',
                description: 'Fastest inference, 12B params, good quality',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_size: { type: 'string', options: ['square_hd', 'landscape_4_3', 'portrait_4_3'], default: 'landscape_4_3' },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 4 },
                    seed: { type: 'number', required: false },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    enable_safety_checker: { type: 'boolean', default: true },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'png' },
                    acceleration: { type: 'string', options: ['none', 'regular', 'high'], default: 'regular' }
                }
            },
            'fal-ai/imagen4/preview/fast': {
                name: 'Imagen 4 Fast',
                description: 'Cost-effective, good quality per $',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: '' },
                    aspect_ratio: { type: 'string', options: ['1:1', '16:9', '9:16', '4:3', '3:4'], default: '1:1' },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/recraft/v2/text-to-image': {
                name: 'Recraft V2',
                description: 'Affordable, vector art/typography',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_size: { type: 'string', options: ['square_hd', 'landscape_4_3', 'portrait_4_3'], default: 'square_hd' },
                    style: { type: 'string', options: ['realistic_image', 'vector_art', 'typography'], default: 'realistic_image' },
                    colors: { type: 'array', required: false, default: [] },
                    style_id: { type: 'string', required: false },
                    enable_safety_checker: { type: 'boolean', default: true }
                }
            },
            'fal-ai/f-lite/standard': {
                name: 'F Lite Standard',
                description: '10B params, copyright-safe, SFW, efficient',
                operation: 'text-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: 'Blurry, out of focus, low resolution, bad anatomy, ugly, deformed, poorly drawn, extra limbs' },
                    image_size: { type: 'string', options: ['square_hd', 'landscape_4_3', 'portrait_4_3'], default: 'landscape_4_3' },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 28 },
                    guidance_scale: { type: 'number', min: 1, max: 20, default: 3.5 },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    enable_safety_checker: { type: 'boolean', default: true }
                }
            },
            // Text-to-Video Models
            'fal-ai/kling-video/v2/master/text-to-video': {
                name: 'Kling 2.0 Master',
                description: 'Kling 2.0 Master Text to Video API with enhanced text understanding, motion quality, and visual quality.',
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    duration: { type: 'string', options: ['5', '10'], default: '5' },
                    aspect_ratio: { type: 'string', options: ['16:9', '9:16', '1:1'], default: '16:9' },
                    negative_prompt: { type: 'string', required: false, default: 'blur, distort, and low quality' },
                    cfg_scale: { type: 'number', min: 0, max: 2, default: 0.5 }
                }
            },
            'fal-ai/bytedance/seedance/v1/pro/text-to-video': {
                name: 'Seedance 1.0 Pro',
                description: 'High quality video generation model developed by Bytedance with 1080p resolution.',
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'], default: '16:9' },
                    resolution: { type: 'string', options: ['480p', '1080p'], default: '1080p' },
                    duration: { type: 'string', options: ['5', '10'], default: '5' },
                    camera_fixed: { type: 'boolean', default: false },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/pixverse/v4/text-to-video/fast': {
                name: 'PixVerse V4 Fast',
                description: 'PixVerse V4 Fast: High quality, fast text-to-video generation with support for aspect ratio, resolution, style, and negative prompt.',
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['16:9', '4:3', '1:1', '3:4', '9:16'], default: '16:9' },
                    resolution: { type: 'string', options: ['360p', '540p', '720p'], default: '720p' },
                    negative_prompt: { type: 'string', required: false },
                    style: { type: 'string', options: ['anime', '3d_animation', 'clay', 'comic', 'cyberpunk'], required: false },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/pixverse/v4.5/text-to-video': {
                name: 'PixVerse V4.5',
                description: 'PixVerse V4.5: High quality text-to-video generation with support for aspect ratio, resolution, style, duration, and negative prompt.',
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['16:9', '4:3', '1:1', '3:4', '9:16'], default: '16:9' },
                    resolution: { type: 'string', options: ['360p', '540p', '720p', '1080p'], default: '720p' },
                    duration: { type: 'string', options: ['5', '8'], default: '5' },
                    negative_prompt: { type: 'string', required: false },
                    style: { type: 'string', options: ['anime', '3d_animation', 'clay', 'comic', 'cyberpunk'], required: false },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/wan-pro/text-to-video': {
                name: 'Wan Pro',
                description: 'Generate a 6-second 1080p video (at 30 FPS) from text using an enhanced version of Wan 2.1.',
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    enable_safety_checker: { type: 'boolean', default: true, required: false }
                }
            },
            'fal-ai/luma-dream-machine/ray-2-flash': {
                name: 'Luma Ray2 Flash',
                description: 'Luma Ray2 Flash: State of the art text-to-video generation with advanced aspect ratio, resolution, and looping support.',
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['16:9', '9:16', '4:3', '3:4', '21:9', '9:21'], default: '16:9' },
                    loop: { type: 'boolean', required: false },
                    resolution: { type: 'string', options: ['540p', '720p', '1080p'], default: '540p' },
                    duration: { type: 'string', options: ['5s', '9s'], default: '5s' }
                }
            },
            'fal-ai/pika/v2.2/text-to-video': {
                name: 'Pika 2.2',
                description: 'Pika 2.2: High quality text-to-video generation with support for resolution and duration options.',
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    negative_prompt: { type: 'string', required: false, default: '' },
                    aspect_ratio: { type: 'string', options: ['16:9', '9:16', '1:1', '4:5', '5:4', '3:2', '2:3'], default: '16:9' },
                    resolution: { type: 'string', options: ['720p', '1080p'], default: '720p' },
                    duration: { type: 'number', options: [5], default: 5 }
                }
            },
            'fal-ai/minimax/hailuo-02/standard/text-to-video': {
                name: 'MiniMax Hailuo-02',
                description: 'MiniMax Hailuo-02: Advanced video generation model with 768p resolution and prompt optimization.',
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    duration: { type: 'string', options: ['6', '10'], default: '6' },
                    prompt_optimizer: { type: 'boolean', default: true, required: false }
                }
            },
            'fal-ai/veo3': {
                name: 'Veo 3',
                description: "Veo 3: Generate videos using Google's Veo 3 Fast model with advanced prompt enhancement and audio support.",
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['16:9', '9:16', '1:1'], default: '16:9' },
                    duration: { type: 'string', options: ['8s'], default: '8s' },
                    negative_prompt: { type: 'string', required: false },
                    enhance_prompt: { type: 'boolean', default: true, required: false },
                    seed: { type: 'number', required: false },
                    resolution: { type: 'string', options: ['720p', '1080p'], default: '720p' },
                    generate_audio: { type: 'boolean', default: true, required: false }
                }
            },
            'fal-ai/veo2': {
                name: 'Veo 2',
                description: "Veo 2: Generate videos using Google's Veo 2 text-to-video model with advanced prompt enhancement.",
                operation: 'text-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['16:9', '9:16'], default: '16:9' },
                    duration: { type: 'string', options: ['5s', '6s', '7s', '8s'], default: '5s' },
                    negative_prompt: { type: 'string', required: false },
                    enhance_prompt: { type: 'boolean', default: true, required: false },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/veo2/image-to-video': {
                name: 'Veo 2 Image-to-Video',
                description: "Generate videos by animating an input image using Google's Veo 2 model.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['auto', 'auto_prefer_portrait', '16:9', '9:16'], default: 'auto' },
                    duration: { type: 'string', options: ['5s', '6s', '7s', '8s'], default: '5s' }
                }
            },
            'fal-ai/wan-pro/image-to-video': {
                name: 'Wan Pro',
                description: "Generate a 6-second 1080p video (at 30 FPS) from an image and text using an enhanced version of Wan 2.1.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    enable_safety_checker: { type: 'boolean', required: false, default: true }
                }
            },
            'fal-ai/kling-video/v2.1/standard/image-to-video': {
                name: 'Kling 2.1 (std)',
                description: "Kling 2.1 (std) Image to Video API.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    duration: { type: 'string', options: ['5', '10'], default: '5' },
                    negative_prompt: { type: 'string', required: false, default: 'blur, distort, and low quality' },
                    cfg_scale: { type: 'number', required: false, default: 0.5 }
                }
            },
            'fal-ai/bytedance/seedance/v1/lite/image-to-video': {
                name: 'Seedance 1.0 Lite',
                description: "Generate videos from an image and text using Bytedance's Seedance 1.0 Lite model.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    resolution: { type: 'string', options: ['480p', '720p', '1080p'], default: '720p' },
                    duration: { type: 'string', options: ['5', '10'], default: '5' },
                    camera_fixed: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    end_image_url: { type: 'string', required: false }
                }
            },
            'fal-ai/minimax/hailuo-02/pro/image-to-video': {
                name: 'MiniMax Hailuo-02 (Pro)',
                description: "MiniMax Hailuo-02 Image To Video API (Pro, 1080p): Advanced image-to-video generation model with 1080p resolution.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    prompt_optimizer: { type: 'boolean', required: false, default: true }
                }
            },
            'fal-ai/wan-i2v': {
                name: 'Wan I2V',
                description: "Wan I2V: Advanced image-to-video with prompt, negative_prompt, and many controls.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: 'bright colors, overexposed, static, blurred details, subtitles, style, artwork, painting, picture, still, overall gray, worst quality, low quality, JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, malformed limbs, fused fingers, still picture, cluttered background, three legs, many people in the background, walking backwards' },
                    num_frames: { type: 'number', required: false, default: 81 },
                    frames_per_second: { type: 'number', required: false, default: 16 },
                    seed: { type: 'number', required: false },
                    resolution: { type: 'string', required: false, options: ['480p', '720p'], default: '720p' },
                    num_inference_steps: { type: 'number', required: false, options: [4, 8, 16, 32], default: 16 },
                    enable_safety_checker: { type: 'boolean', required: false },
                    enable_prompt_expansion: { type: 'boolean', required: false },
                    acceleration: { type: 'string', required: false, options: ['none', 'regular'], default: 'regular' },
                    aspect_ratio: { type: 'string', required: false, options: ['auto', '16:9', '9:16', '1:1'], default: 'auto' }
                }
            },
            'fal-ai/pixverse/v4.5/image-to-video': {
                name: 'PixVerse V4.5',
                description: "PixVerse V4.5: High quality image-to-video with style, aspect ratio, and resolution options.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    aspect_ratio: { type: 'string', options: ['16:9', '4:3', '1:1', '3:4', '9:16'], default: '16:9' },
                    resolution: { type: 'string', options: ['360p', '540p', '720p', '1080p'], default: '720p' },
                    duration: { type: 'string', options: ['5', '8'], default: '5' },
                    negative_prompt: { type: 'string', required: false, default: '' },
                    style: { type: 'string', options: ['anime', '3d_animation', 'clay', 'comic', 'cyberpunk'] },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/luma-dream-machine/ray-2-flash/image-to-video': {
                name: 'Luma Ray2',
                description: "Luma Ray2: State of the art image-to-video with aspect ratio, loop, and resolution options.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: false },
                    end_image_url: { type: 'string', required: false },
                    aspect_ratio: { type: 'string', options: ['16:9', '9:16', '4:3', '3:4', '21:9', '9:21'], default: '16:9' },
                    loop: { type: 'boolean', required: false },
                    resolution: { type: 'string', options: ['540p', '720p', '1080p'], default: '540p' },
                    duration: { type: 'string', options: ['5s'], default: '5s' }
                }
            },
            'fal-ai/magi-distilled/image-to-video': {
                name: 'Magi Distilled',
                description: "Magi Distilled: Generate a video from an image with advanced controls.",
                operation: 'image-to-video',
                category: 'cost-effective',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    num_frames: { type: 'number', required: false, default: 96 },
                    seed: { type: 'number', required: false },
                    resolution: { type: 'string', options: ['480p', '720p'], default: '720p' },
                    num_inference_steps: { type: 'number', required: false, options: [4, 8, 16, 32], default: 16 },
                    enable_safety_checker: { type: 'boolean', required: false, default: true },
                    aspect_ratio: { type: 'string', options: ['auto', '16:9', '9:16', '1:1'], default: 'auto' }
                }
            },
            'fal-ai/lyria2': {
                name: 'Lyria 2 Text-to-Music',
                description: "Generate music using Google's Lyria 2 text-to-music model.",
                operation: 'text-to-audio',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false, default: 'low quality' },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/ace-step': {
                name: 'ACE-Step Text-to-Audio',
                description: 'Generate audio from text using the ACE-Step model.',
                operation: 'text-to-audio',
                parameters: {
                    tags: { type: 'string', required: true },
                    lyrics: { type: 'string', required: false },
                    duration: { type: 'number', required: false, default: 60 },
                    number_of_steps: { type: 'number', required: false, default: 27 },
                    seed: { type: 'number', required: false },
                    scheduler: { type: 'string', required: false, default: 'euler' },
                    guidance_type: { type: 'string', required: false, default: 'apg' },
                    granularity_scale: { type: 'number', required: false, default: 10 },
                    guidance_interval: { type: 'number', required: false, default: 0.5 },
                    guidance_interval_decay: { type: 'number', required: false, default: 0 },
                    guidance_scale: { type: 'number', required: false, default: 15 },
                    minimum_guidance_scale: { type: 'number', required: false, default: 3 },
                    tag_guidance_scale: { type: 'number', required: false, default: 5 },
                    lyric_guidance_scale: { type: 'number', required: false, default: 1.5 }
                }
            },
            'CassetteAI/music-generator': {
                name: 'CassetteAI Music Generator',
                description: 'Generate music from a text prompt using CassetteAI.',
                operation: 'text-to-audio',
                parameters: {
                    prompt: { type: 'string', required: true },
                    duration: { type: 'number', required: true }
                }
            },
            'fal-ai/ace-step/prompt-to-audio': {
                name: 'ACE-Step Prompt-to-Audio',
                description: 'Generate audio from a prompt using the ACE-Step model.',
                operation: 'text-to-audio',
                parameters: {
                    prompt: { type: 'string', required: true },
                    instrumental: { type: 'boolean', required: false },
                    duration: { type: 'number', required: false, default: 60 },
                    number_of_steps: { type: 'number', required: false, default: 27 },
                    seed: { type: 'number', required: false },
                    scheduler: { type: 'string', required: false, default: 'euler' },
                    guidance_type: { type: 'string', required: false, default: 'apg' },
                    granularity_scale: { type: 'number', required: false, default: 10 },
                    guidance_interval: { type: 'number', required: false, default: 0.5 },
                    guidance_interval_decay: { type: 'number', required: false, default: 0 },
                    guidance_scale: { type: 'number', required: false, default: 15 },
                    minimum_guidance_scale: { type: 'number', required: false, default: 3 },
                    tag_guidance_scale: { type: 'number', required: false, default: 5 },
                    lyric_guidance_scale: { type: 'number', required: false, default: 1.5 }
                }
            },
            'cassetteai/sound-effects-generator': {
                name: 'CassetteAI Sound Effects Generator',
                description: 'Generate high-quality sound effects from a prompt using CassetteAI.',
                operation: 'text-to-audio',
                parameters: {
                    prompt: { type: 'string', required: true },
                    duration: { type: 'number', required: true }
                }
            },
            'fal-ai/diffrhythm': {
                name: 'DiffRhythm',
                description: 'Generate full songs from lyrics using DiffRhythm.',
                operation: 'text-to-audio',
                parameters: {
                    lyrics: { type: 'string', required: true },
                    reference_audio_url: { type: 'string', required: false },
                    style_prompt: { type: 'string', required: false },
                    music_duration: { type: 'string', required: false, options: ['95s', '285s'], default: '95s' },
                    cfg_strength: { type: 'number', required: false, default: 4 },
                    scheduler: { type: 'string', required: false, options: ['euler', 'midpoint', 'rk4', 'implicit_adams'], default: 'euler' },
                    num_inference_steps: { type: 'number', required: false, default: 32 }
                }
            },
            'fal-ai/elevenlabs/sound-effects': {
                name: 'ElevenLabs Sound Effects',
                description: 'Generate sound effects using ElevenLabs advanced model.',
                operation: 'text-to-audio',
                parameters: {
                    text: { type: 'string', required: true },
                    duration_seconds: { type: 'number', required: false, min: 0.5, max: 22 },
                    prompt_influence: { type: 'number', required: false, default: 0.3, min: 0, max: 1 }
                }
            },
            'fal-ai/yue': {
                name: 'YuE',
                description: 'Generate music from lyrics and genres using YuE.',
                operation: 'text-to-audio',
                parameters: {
                    lyrics: { type: 'string', required: true },
                    genres: { type: 'string', required: true }
                }
            },
            'fal-ai/mmaudio-v2/text-to-audio': {
                name: 'MMAudio V2',
                description: 'Generate synchronized audio from text using MMAudio V2.',
                operation: 'text-to-audio',
                parameters: {
                    prompt: { type: 'string', required: true },
                    negative_prompt: { type: 'string', required: false },
                    seed: { type: 'number', required: false },
                    num_steps: { type: 'number', required: false, default: 25 },
                    duration: { type: 'number', required: false, default: 8 },
                    cfg_strength: { type: 'number', required: false, default: 4.5 },
                    mask_away_clip: { type: 'boolean', required: false }
                }
            },
            'fal-ai/minimax-music': {
                name: 'MiniMax Music',
                description: 'Generate music from lyrics and reference audio using MiniMax.',
                operation: 'text-to-audio',
                parameters: {
                    prompt: { type: 'string', required: true, maxLength: 600 },
                    reference_audio_url: { type: 'string', required: false }
                }
            },
            'resemble-ai/chatterboxhd/text-to-speech': {
                name: 'ChatterboxHD TTS',
                description: 'High-quality TTS with voice selection, emotion, and more.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            'fal-ai/orpheus-tts': {
                name: 'Orpheus TTS',
                description: 'Orpheus TTS: High-quality TTS with advanced voice selection and emotion.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            'fal-ai/minimax/speech-02-hd': {
                name: 'MiniMax Speech 02 HD',
                description: 'MiniMax Speech 02 HD: High-quality TTS with advanced voice selection and emotion.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            'fal-ai/dia-tts': {
                name: 'Dia TTS',
                description: 'Dia TTS: High-quality TTS with advanced voice selection and emotion.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            'fal-ai/minimax/voice-clone': {
                name: 'MiniMax Voice Clone',
                description: 'MiniMax Voice Clone: High-quality TTS with advanced voice selection and emotion.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            'fal-ai/playai/tts/v3': {
                name: 'PlayAI TTS v3',
                description: 'PlayAI TTS v3: High-quality TTS with advanced voice selection and emotion.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            'fal-ai/elevenlabs/tts/turbo-v2.5': {
                name: 'ElevenLabs Turbo v2.5',
                description: 'ElevenLabs Turbo v2.5: High-quality TTS with advanced voice selection and emotion.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            'fal-ai/minimax/speech-02-turbo': {
                name: 'MiniMax Speech 02 Turbo',
                description: 'MiniMax Speech 02 Turbo: High-quality TTS with advanced voice selection and emotion.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            'fal-ai/chatterbox/text-to-speech': {
                name: 'Chatterbox TTS',
                description: 'Chatterbox TTS: High-quality TTS with advanced voice selection and emotion.',
                operation: 'text-to-speech',
                parameters: {
                    text: { type: 'string', required: true },
                    voice: { type: 'string', required: false },
                    audio_url: { type: 'string', required: false },
                    exaggeration: { type: 'number', required: false, default: 0.25 },
                    cfg: { type: 'number', required: false, default: 0.5 },
                    high_quality_audio: { type: 'boolean', required: false },
                    seed: { type: 'number', required: false },
                    temperature: { type: 'number', required: false, default: 0.8 }
                }
            },
            // Image-to-Image Models
            'fal-ai/image-editing/background-change': {
                name: 'Background Change',
                description: 'Replace photo backgrounds with any scene while preserving the main subject.',
                operation: 'image-to-image',
                parameters: {
                    image_url: { type: 'string', required: true },
                    prompt: { type: 'string', required: false, default: 'beach sunset with palm trees' },
                    guidance_scale: { type: 'number', min: 0, max: 20, default: 3.5 },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 30 },
                    safety_tolerance: { type: 'string', options: ['1', '2', '3', '4', '5', '6'], default: '2' },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' },
                    aspect_ratio: { type: 'string', options: ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'], required: false },
                    seed: { type: 'number', required: false },
                    sync_mode: { type: 'boolean', default: false }
                }
            },
            'fal-ai/image-editing/face-enhancement': {
                name: 'Face Enhancement',
                description: 'Professional facial retouching with natural-looking enhancements.',
                operation: 'image-to-image',
                parameters: {
                    image_url: { type: 'string', required: true },
                    guidance_scale: { type: 'number', min: 0, max: 20, default: 3.5 },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 30 },
                    safety_tolerance: { type: 'string', options: ['1', '2', '3', '4', '5', '6'], default: '2' },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' },
                    aspect_ratio: { type: 'string', options: ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'], required: false },
                    seed: { type: 'number', required: false },
                    sync_mode: { type: 'boolean', default: false }
                }
            },
            'fal-ai/image-editing/color-correction': {
                name: 'Color Correction',
                description: 'Professional color grading and tone adjustment for consistent results.',
                operation: 'image-to-image',
                parameters: {
                    image_url: { type: 'string', required: true },
                    guidance_scale: { type: 'number', min: 0, max: 20, default: 3.5 },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 30 },
                    safety_tolerance: { type: 'string', options: ['1', '2', '3', '4', '5', '6'], default: '2' },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' },
                    aspect_ratio: { type: 'string', options: ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'], required: false },
                    seed: { type: 'number', required: false },
                    sync_mode: { type: 'boolean', default: false }
                }
            },
            'fal-ai/post-processing/sharpen': {
                name: 'Image Sharpening',
                description: 'Apply sharpening effects with three modes: basic, smart, and CAS.',
                operation: 'image-to-image',
                parameters: {
                    image_url: { type: 'string', required: true },
                    sharpen_mode: { type: 'string', options: ['basic', 'smart', 'cas'], default: 'basic' },
                    sharpen_radius: { type: 'number', min: 1, max: 10, default: 1 },
                    sharpen_alpha: { type: 'number', min: 0.1, max: 2.0, default: 1 },
                    noise_radius: { type: 'number', min: 1, max: 20, default: 7 },
                    preserve_edges: { type: 'number', min: 0.1, max: 1.0, default: 0.75 },
                    smart_sharpen_strength: { type: 'number', min: 1, max: 10, default: 5 },
                    smart_sharpen_ratio: { type: 'number', min: 0.1, max: 1.0, default: 0.5 },
                    cas_amount: { type: 'number', min: 0.1, max: 2.0, default: 0.8 }
                }
            },
            'fal-ai/image-editing/object-removal': {
                name: 'Object Removal',
                description: 'Remove unwanted objects from photos with seamless background reconstruction.',
                operation: 'image-to-image',
                parameters: {
                    image_url: { type: 'string', required: true },
                    prompt: { type: 'string', required: false, default: 'remove unwanted objects while preserving background' },
                    guidance_scale: { type: 'number', min: 0, max: 20, default: 3.5 },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 30 },
                    safety_tolerance: { type: 'string', options: ['1', '2', '3', '4', '5', '6'], default: '2' },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' },
                    aspect_ratio: { type: 'string', options: ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'], required: false },
                    seed: { type: 'number', required: false },
                    sync_mode: { type: 'boolean', default: false }
                }
            },
            'fal-ai/flux/dev/image-to-image': {
                name: 'FLUX Dev Image-to-Image',
                description: 'High-quality image transformation with 12B parameter flow transformer.',
                operation: 'image-to-image',
                parameters: {
                    image_url: { type: 'string', required: true },
                    prompt: { type: 'string', required: true },
                    strength: { type: 'number', min: 0, max: 1, default: 0.95 },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 40 },
                    seed: { type: 'number', required: false },
                    guidance_scale: { type: 'number', min: 0, max: 20, default: 3.5 },
                    sync_mode: { type: 'boolean', default: false },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    enable_safety_checker: { type: 'boolean', default: true },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' },
                    acceleration: { type: 'string', options: ['none', 'regular', 'high'], default: 'none' }
                }
            },
            'fal-ai/recraft/v3/image-to-image': {
                name: 'Recraft V3 Image-to-Image',
                description: 'Advanced image editing with typography and vector art capabilities.',
                operation: 'image-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    strength: { type: 'number', min: 0, max: 1, default: 0.5 },
                    style: { type: 'string', options: ['realistic_image', 'digital_illustration', 'vector_illustration'], default: 'realistic_image' },
                    colors: {
                        type: 'array',
                        required: false,
                        items: {
                            type: 'object',
                            properties: {
                                r: { type: 'number', min: 0, max: 255, required: true },
                                g: { type: 'number', min: 0, max: 255, required: true },
                                b: { type: 'number', min: 0, max: 255, required: true }
                            }
                        }
                    },
                    style_id: { type: 'string', required: false },
                    negative_prompt: { type: 'string', required: false },
                    sync_mode: { type: 'boolean', default: false }
                }
            },
            'fal-ai/luma-photon/modify': {
                name: 'Luma Photon Modify',
                description: 'Creative, personalizable image editing with intelligent visual models.',
                operation: 'image-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    strength: { type: 'number', min: 0, max: 1, default: 0.8 },
                    aspect_ratio: { type: 'string', options: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21'], default: '16:9' }
                }
            },
            'fal-ai/bytedance/seededit/v3/edit-image': {
                name: 'ByteDance SeedEdit V3',
                description: 'Accurate image editing with precise content preservation.',
                operation: 'image-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    image_url: { type: 'string', required: true },
                    guidance_scale: { type: 'number', min: 0, max: 20, default: 0.5 },
                    seed: { type: 'number', required: false }
                }
            },
            'fal-ai/flux-pro/kontext/max/multi': {
                name: 'FLUX Pro Kontext Max Multi',
                description: 'Premium image editing with multiple image support and improved prompt adherence.',
                operation: 'image-to-image',
                parameters: {
                    prompt: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    guidance_scale: { type: 'number', min: 0, max: 20, default: 3.5 },
                    sync_mode: { type: 'boolean', default: false },
                    num_images: { type: 'number', min: 1, max: 4, default: 1 },
                    output_format: { type: 'string', options: ['jpeg', 'png'], default: 'jpeg' },
                    safety_tolerance: { type: 'string', options: ['1', '2', '3', '4', '5', '6'], default: '2' },
                    aspect_ratio: { type: 'string', options: ['21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'], required: false },
                    image_urls: { type: 'array', required: true }
                }
            },
            'fal-ai/luma-dream-machine/ray-2/modify': {
                name: 'Ray2 Modify Video',
                description: 'Ray2 Modify is a video generative model capable of restyling or retexturing the entire shot.',
                operation: 'video-to-video',
                parameters: {
                    video_url: { type: 'string', required: true },
                    image_url: { type: 'string', required: false },
                    prompt: { type: 'string', required: false },
                    mode: {
                        type: 'string',
                        required: false,
                        options: [
                            'adhere_1', 'adhere_2', 'adhere_3',
                            'flex_1', 'flex_2', 'flex_3',
                            'reimagine_1', 'reimagine_2', 'reimagine_3'
                        ],
                        default: 'flex_1'
                    }
                }
            },
            'fal-ai/wan-vace-14b': {
                name: 'Wan VACE 14B',
                description: 'Endpoint for inpainting a video from all supported sources.',
                operation: 'video-to-video',
                parameters: {
                    prompt: { type: 'string', required: false },
                    negative_prompt: { type: 'string', required: false },
                    match_input_num_frames: { type: 'boolean', required: false },
                    num_frames: { type: 'number', required: false },
                    match_input_frames_per_second: { type: 'boolean', required: false },
                    frames_per_second: { type: 'number', required: false },
                    task: { type: 'string', required: false },
                    seed: { type: 'number', required: false },
                    resolution: { type: 'string', required: false },
                    aspect_ratio: { type: 'string', required: false },
                    num_inference_steps: { type: 'number', required: false },
                    guidance_scale: { type: 'number', required: false },
                    video_url: { type: 'string', required: true },
                    mask_video_url: { type: 'string', required: false },
                    mask_image_url: { type: 'string', required: false },
                    ref_image_urls: { type: 'array', required: false },
                    enable_safety_checker: { type: 'boolean', required: false },
                    enable_prompt_expansion: { type: 'boolean', required: false },
                    preprocess: { type: 'string', required: false },
                    acceleration: { type: 'string', required: false }
                }
            },
            'tripo3d/tripo/v2.5/image-to-3d': {
                name: 'Tripo3D v2.5 Image-to-3D',
                description: 'Generate a 3D model from a single image using Tripo3D.',
                operation: 'image-to-3d',
                parameters: {
                    image_url: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    face_limit: { type: 'number', required: false },
                    pbr: { type: 'boolean', default: true, required: false },
                    texture: { type: 'string', options: ['no', 'standard', 'HD'], default: 'standard', required: false },
                    texture_seed: { type: 'number', required: false },
                    auto_size: { type: 'boolean', default: false, required: false },
                    style: { type: 'string', options: ['none', 'person:person2cartoon', 'object:clay', 'object:steampunk', 'animal:venom', 'object:barbie', 'object:christmas', 'gold', 'ancient_bronze'], required: false },
                    quad: { type: 'boolean', default: false, required: false },
                    texture_alignment: { type: 'string', options: ['original_image', 'geometry'], default: 'original_image', required: false },
                    orientation: { type: 'string', options: ['default', 'align_image'], default: 'default', required: false }
                }
            },
            'fal-ai/hunyuan3d-v21': {
                name: 'Hunyuan3D v21',
                description: 'Tencent Hunyuan3D v21 single image to 3D.',
                operation: 'image-to-3d',
                parameters: {
                    input_image_url: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 50, required: false },
                    guidance_scale: { type: 'number', min: 1, max: 20, default: 7.5, required: false },
                    octree_resolution: { type: 'number', min: 64, max: 512, default: 256, required: false },
                    textured_mesh: { type: 'boolean', default: false, required: false }
                }
            },
            'fal-ai/hyper3d/rodin': {
                name: 'Hyper3D Rodin',
                description: 'Hyper3D Rodin single/multi image to 3D.',
                operation: 'image-to-3d',
                parameters: {
                    prompt: { type: 'string', required: false, default: '' },
                    input_image_urls: { type: 'array', required: true },
                    condition_mode: { type: 'string', options: ['concat', 'fuse'], default: 'concat', required: false },
                    seed: { type: 'number', min: 0, max: 65535, required: false },
                    geometry_file_format: { type: 'string', options: ['glb', 'usdz', 'fbx', 'obj', 'stl'], default: 'glb', required: false },
                    material: { type: 'string', options: ['PBR', 'Shaded'], default: 'PBR', required: false },
                    quality: { type: 'string', options: ['high', 'medium', 'low', 'extra-low'], default: 'medium', required: false },
                    use_hyper: { type: 'boolean', default: false, required: false },
                    tier: { type: 'string', options: ['Regular', 'Sketch'], default: 'Regular', required: false },
                    TAPose: { type: 'boolean', default: false, required: false },
                    bbox_condition: { type: 'array', required: false },
                    addons: { type: 'string', options: ['none', 'HighPack'], default: 'none', required: false }
                }
            },
            'fal-ai/trellis': {
                name: 'Trellis',
                description: 'Trellis single image to 3D.',
                operation: 'image-to-3d',
                parameters: {
                    image_url: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    ss_guidance_strength: { type: 'number', min: 0, max: 20, default: 7.5, required: false },
                    ss_sampling_steps: { type: 'number', min: 1, max: 50, default: 12, required: false },
                    slat_guidance_strength: { type: 'number', min: 0, max: 20, default: 3, required: false },
                    slat_sampling_steps: { type: 'number', min: 1, max: 50, default: 12, required: false },
                    mesh_simplify: { type: 'number', min: 0, max: 1, default: 0.95, required: false },
                    texture_size: { type: 'number', options: [512, 1024, 2048], default: 1024, required: false }
                }
            },
            'tripo3d/tripo/v2.5/multiview-to-3d': {
                name: 'Tripo3D v2.5 Multiview-to-3D',
                description: 'Generate a 3D model from multiple views using Tripo3D.',
                operation: 'image-to-3d',
                parameters: {
                    front_image_url: { type: 'string', required: true },
                    left_image_url: { type: 'string', required: false },
                    back_image_url: { type: 'string', required: false },
                    right_image_url: { type: 'string', required: false },
                    seed: { type: 'number', required: false },
                    face_limit: { type: 'number', required: false },
                    pbr: { type: 'boolean', default: true, required: false },
                    texture: { type: 'string', options: ['no', 'standard', 'HD'], default: 'standard', required: false },
                    texture_seed: { type: 'number', required: false },
                    auto_size: { type: 'boolean', default: false, required: false },
                    style: { type: 'string', options: ['none', 'person:person2cartoon', 'object:clay', 'object:steampunk', 'animal:venom', 'object:barbie', 'object:christmas', 'gold', 'ancient_bronze'], required: false },
                    quad: { type: 'boolean', default: false, required: false },
                    texture_alignment: { type: 'string', options: ['original_image', 'geometry'], default: 'original_image', required: false },
                    orientation: { type: 'string', options: ['default', 'align_image'], default: 'default', required: false }
                }
            },
            'fal-ai/hunyuan3d/v2/multi-view': {
                name: 'Hunyuan3D v2 Multi-view',
                description: 'Hunyuan3D v2 multi-view image to 3D.',
                operation: 'image-to-3d',
                parameters: {
                    front_image_url: { type: 'string', required: true },
                    back_image_url: { type: 'string', required: false },
                    left_image_url: { type: 'string', required: false },
                    seed: { type: 'number', required: false },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 50, required: false },
                    guidance_scale: { type: 'number', min: 1, max: 20, default: 7.5, required: false },
                    octree_resolution: { type: 'number', min: 64, max: 512, default: 256, required: false },
                    textured_mesh: { type: 'boolean', default: false, required: false }
                }
            },
            'fal-ai/trellis/multi': {
                name: 'Trellis Multi',
                description: 'Trellis multi-image to 3D.',
                operation: 'image-to-3d',
                parameters: {
                    image_urls: { type: 'array', required: true },
                    seed: { type: 'number', required: false },
                    ss_guidance_strength: { type: 'number', min: 0, max: 20, default: 7.5, required: false },
                    ss_sampling_steps: { type: 'number', min: 1, max: 50, default: 12, required: false },
                    slat_guidance_strength: { type: 'number', min: 0, max: 20, default: 3, required: false },
                    slat_sampling_steps: { type: 'number', min: 1, max: 50, default: 12, required: false },
                    mesh_simplify: { type: 'number', min: 0, max: 1, default: 0.95, required: false },
                    texture_size: { type: 'number', options: [512, 1024, 2048], default: 1024, required: false },
                    multiimage_algo: { type: 'string', options: ['stochastic', 'multidiffusion'], default: 'stochastic', required: false }
                }
            },
            'fal-ai/hunyuan3d/v2': {
                name: 'Hunyuan3D v2',
                description: 'Hunyuan3D v2 single image to 3D.',
                operation: 'image-to-3d',
                parameters: {
                    input_image_url: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 50, required: false },
                    guidance_scale: { type: 'number', min: 1, max: 20, default: 7.5, required: false },
                    octree_resolution: { type: 'number', min: 64, max: 512, default: 256, required: false },
                    textured_mesh: { type: 'boolean', default: false, required: false }
                }
            },
            'fal-ai/hunyuan3d/v2/turbo': {
                name: 'Hunyuan3D v2 Turbo',
                description: 'Hunyuan3D v2 turbo single image to 3D.',
                operation: 'image-to-3d',
                parameters: {
                    input_image_url: { type: 'string', required: true },
                    seed: { type: 'number', required: false },
                    num_inference_steps: { type: 'number', min: 1, max: 100, default: 50, required: false },
                    guidance_scale: { type: 'number', min: 1, max: 20, default: 7.5, required: false },
                    octree_resolution: { type: 'number', min: 64, max: 512, default: 256, required: false },
                    textured_mesh: { type: 'boolean', default: false, required: false }
                }
            },
            'fal-ai/triposr': {
                name: 'TripoSR',
                description: 'TripoSR image to 3D model generation.',
                operation: 'image-to-3d',
                parameters: {
                    image_url: { type: 'string', required: true },
                    output_format: { type: 'string', options: ['glb', 'obj'], default: 'glb', required: false },
                    do_remove_background: { type: 'boolean', default: true, required: false },
                    foreground_ratio: { type: 'number', min: 0, max: 1, default: 0.9, required: false },
                    mc_resolution: { type: 'number', min: 64, max: 512, default: 256, required: false }
                }
            }
        };
        // Add all video-to-video models from the dedicated param file
        for (const [modelId, paramArray] of Object.entries(videoToVideoModalParams)) {
            const meta = videoToVideoModelMeta[modelId] || {};
            models[modelId] = {
                name: meta.name || modelId,
                description: meta.description || '',
                operation: 'video-to-video',
                parameters: paramArray.reduce((acc, param) => {
                    acc[param.action_id] = {
                        type: param.type,
                        required: param.required,
                        ...(param.options ? { options: param.options.map(opt => opt.value || opt) } : {}),
                        ...(param.default !== undefined ? { default: param.default } : {})
                    };
                    return acc;
                }, {})
            };
        }
        // NOTE: All video-to-video schemas are now loaded from videoToVideoModalParams.js for maintainability.
        return models;
    }

    /**
     * Validate state transition
     * @param {string} currentState - Current workflow state
     * @param {string} newState - New workflow state
     * @param {Object} context - Session context
     * @returns {boolean} Whether transition is valid
     */
    validateTransition(currentState, newState, context = {}) {
        const currentStateConfig = this.workflowStates[currentState];
        if (!currentStateConfig) {
            logger.warn(`Cursor Rules Engine: Invalid current state: ${currentState}`);
            return false;
        }

        const allowedTransitions = currentStateConfig.allowedTransitions;
        const isValid = allowedTransitions.includes(newState);

        if (!isValid) {
            logger.warn(`Cursor Rules Engine: Invalid transition ${currentState} → ${newState}`, {
                allowedTransitions,
                context: Object.keys(context)
            });
        }

        return isValid;
    }

    /**
     * Get workflow progress for a state
     * @param {string} state - Workflow state
     * @returns {number} Progress percentage
     */
    getWorkflowProgress(state) {
        const stateConfig = this.workflowStates[state];
        return stateConfig ? stateConfig.progress : 0;
    }

    /**
     * Get next step in workflow
     * @param {string} currentState - Current state
     * @param {Object} context - Session context
     * @returns {Object} Next step information
     */
    getNextStep(currentState, context = {}) {
        const stateConfig = this.workflowStates[currentState];
        if (!stateConfig) {
            return { error: 'Invalid state' };
        }

        const allowedTransitions = stateConfig.allowedTransitions;
        const nextState = allowedTransitions.find(state => state !== 'ERROR');

        if (!nextState) {
            return { error: 'No valid next step' };
        }

        const nextStateConfig = this.workflowStates[nextState];
        return {
            state: nextState,
            name: nextStateConfig.name,
            description: nextStateConfig.description,
            progress: nextStateConfig.progress,
            required: this.getRequiredForState(nextState, context)
        };
    }

    /**
     * Get requirements for a specific state
     * @param {string} state - Target state
     * @param {Object} context - Session context
     * @returns {Array} Required fields/actions
     */
    getRequiredForState(state, context = {}) {
        const requirements = [];

        switch (state) {
            case 'SELECTING_OPERATION':
                if (!context.campaignIdea) {
                    requirements.push('campaignIdea');
                }
                break;
            case 'SELECTING_MODEL':
                if (!context.selectedOperation) {
                    requirements.push('selectedOperation');
                }
                break;
            case 'CONFIGURING_PARAMETERS':
                if (!context.selectedModel) {
                    requirements.push('selectedModel');
                }
                break;
            case 'GENERATING_ASSET':
                if (!context.modelParameters) {
                    requirements.push('modelParameters');
                }
                break;
        }

        return requirements;
    }

    /**
     * Get available operations
     * @returns {Object} Available operations
     */
    getAvailableOperations() {
        return this.operations;
    }

    /**
     * Get models for an operation
     * @param {string} operationId - Operation ID
     * @returns {Array} Available models
     */
    getModelsForOperation(operationId) {
        const operation = this.operations[operationId];
        if (!operation) {
            return [];
        }

        return operation.models.map(modelId => {
            const modelConfig = this.models[modelId];
            if (!modelConfig) return null;
            
            // Add pricing information to the model config
            const pricing = getModelPricing(operationId, modelId);
            return {
            id: modelId,
                ...modelConfig,
                pricing: pricing
            };
        }).filter(Boolean);
    }

    /**
     * Get model configuration
     * @param {string} operationId - Operation ID
     * @param {string} modelId - Model ID
     * @returns {Object} Model configuration
     */
    getModelConfig(operationId, modelId) {
        const model = this.models[modelId];
        if (!model) {
            return null;
        }

        // Check if model supports the requested operation
        const supportsOperation = model.operation === operationId;

        if (!supportsOperation) {
            return null;
        }

        // Add pricing information
        const pricing = getModelPricing(operationId, modelId);

        return {
            id: modelId,
            ...model,
            pricing: pricing,
            currentOperation: operationId
        };
    }

    /**
     * Get workflow summary
     * @returns {Object} Workflow summary
     */
    getWorkflowSummary() {
        const states = Object.keys(this.workflowStates);
        const completedStates = states.filter(state => 
            this.workflowStates[state].progress === 100
        );

        return {
            totalStates: states.length,
            completedStates: completedStates.length,
            progress: Math.round((completedStates.length / states.length) * 100),
            roadmap: this.rules.roadmap
        };
    }

    /**
     * Validate operation parameters
     * @param {string} operationId - Operation ID
     * @param {string} modelId - Model ID
     * @param {Object} parameters - Parameters to validate
     * @returns {Object} Validation result
     */
    validateParameters(operationId, modelId, parameters) {
        const model = this.getModelConfig(operationId, modelId);
        if (!model) {
            return { valid: false, error: 'Invalid model' };
        }

        const errors = [];
        const validatedParams = {};

        for (const [paramName, paramConfig] of Object.entries(model.parameters)) {
            const value = parameters[paramName];

            if (paramConfig.required && !value) {
                errors.push(`Missing required parameter: ${paramName}`);
                continue;
            }

            if (value !== undefined) {
                // Type validation
                if (paramConfig.type === 'number' && typeof value !== 'number') {
                    errors.push(`Parameter ${paramName} must be a number`);
                    continue;
                }

                if (paramConfig.type === 'string' && typeof value !== 'string') {
                    errors.push(`Parameter ${paramName} must be a string`);
                    continue;
                }

                // Range validation for numbers
                if (paramConfig.type === 'number') {
                    if (paramConfig.min !== undefined && value < paramConfig.min) {
                        errors.push(`Parameter ${paramName} must be at least ${paramConfig.min}`);
                        continue;
                    }
                    if (paramConfig.max !== undefined && value > paramConfig.max) {
                        errors.push(`Parameter ${paramName} must be at most ${paramConfig.max}`);
                        continue;
                    }
                }

                // Options validation for strings
                if (paramConfig.type === 'string' && paramConfig.options) {
                    if (!paramConfig.options.includes(value)) {
                        errors.push(`Parameter ${paramName} must be one of: ${paramConfig.options.join(', ')}`);
                        continue;
                    }
                }

                validatedParams[paramName] = value;
            } else if (paramConfig.default !== undefined) {
                validatedParams[paramName] = paramConfig.default;
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            parameters: validatedParams
        };
    }
}

module.exports = CursorRulesEngine; 