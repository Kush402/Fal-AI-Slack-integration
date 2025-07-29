const BaseFalaiService = require('../BaseFalaiService');
const { fal } = require('@fal-ai/client');
const logger = require('../../../utils/logger');

const SUPPORTED_MODELS = [
  // Cost-Effective Models (Higher Quality, Higher Cost)
  {
    id: 'fal-ai/kling-video/v2/master/text-to-video',
    name: 'Kling 2.0 Master',
    description: 'Kling 2.0 Master Text to Video API with enhanced text understanding, motion quality, and visual quality.',
    category: 'cost-effective',
    params: ['prompt', 'duration', 'aspect_ratio', 'negative_prompt', 'cfg_scale']
  },
  {
    id: 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
    name: 'Seedance 1.0 Pro',
    description: 'High quality video generation model developed by Bytedance with 1080p resolution.',
    category: 'cost-effective',
    params: ['prompt', 'aspect_ratio', 'resolution', 'duration', 'camera_fixed', 'seed']
  },
  {
    id: 'fal-ai/pixverse/v4/text-to-video/fast',
    name: 'Text To Video Fast V4',
    description: 'PixVerse V4 Fast: High quality, fast text-to-video generation with support for aspect ratio, resolution, style, and negative prompt.',
    category: 'cost-effective',
    params: ['prompt', 'aspect_ratio', 'resolution', 'negative_prompt', 'style', 'seed']
  },
  {
    id: 'fal-ai/pixverse/v4.5/text-to-video',
    name: 'PixVerse V4.5',
    description: 'PixVerse V4.5: High quality text-to-video generation with support for aspect ratio, resolution, style, duration, and negative prompt.',
    category: 'cost-effective',
    params: ['prompt', 'aspect_ratio', 'resolution', 'duration', 'negative_prompt', 'style', 'seed']
  },
  {
    id: 'fal-ai/wan-pro/text-to-video',
    name: 'Wan Pro',
    description: 'Generate a 6-second 1080p video (at 30 FPS) from text using an enhanced version of Wan 2.1.',
    category: 'cost-effective',
    params: ['prompt', 'seed', 'enable_safety_checker']
  },
  {
    id: 'fal-ai/luma-dream-machine/ray-2-flash',
    name: 'Luma Ray2 Flash',
    description: 'Luma Ray2 Flash: State of the art text-to-video generation with advanced aspect ratio, resolution, and looping support.',
    category: 'cost-effective',
    params: ['prompt', 'aspect_ratio', 'loop', 'resolution', 'duration']
  },
  {
    id: 'fal-ai/pika/v2.2/text-to-video',
    name: 'Pika 2.2',
    description: 'Pika 2.2: High quality text-to-video generation with support for resolution and duration options.',
    category: 'cost-effective',
    params: ['prompt', 'seed', 'negative_prompt', 'aspect_ratio', 'resolution', 'duration']
  },
  {
    id: 'fal-ai/minimax/hailuo-02/standard/text-to-video',
    name: 'MiniMax Hailuo-02',
    description: 'MiniMax Hailuo-02: Advanced video generation model with 768p resolution and prompt optimization.',
    category: 'cost-effective',
    params: ['prompt', 'duration', 'prompt_optimizer']
  },
  {
    id: 'fal-ai/veo3',
    name: 'Veo 3',
    description: 'Veo 3: Generate videos using Google’s Veo 3 Fast model with advanced prompt enhancement and audio support.',
    category: 'cost-effective',
    params: ['prompt', 'aspect_ratio', 'duration', 'negative_prompt', 'seed', 'resolution', 'generate_audio']
  },
  {
    id: 'fal-ai/veo2',
    name: 'Veo 2',
    description: 'Veo 2: Generate videos using Google’s Veo 2 text-to-video model with advanced prompt enhancement.',
    category: 'cost-effective',
    params: ['prompt', 'aspect_ratio', 'duration', 'negative_prompt', 'seed']
  }
];

class TextToVideoService extends BaseFalaiService {
  constructor() {
    super('textToVideo', SUPPORTED_MODELS);
  }

  async generateContent(modelId, input = {}, options = {}) {
    this.validateModelAndInputs(modelId, input, options);
    const jobId = options.jobId || null;
    
    try {
      // FIX: Use supportedModels array to get model config
      const modelConfig = this.supportedModels.find(m => m.id === modelId);
      if (!modelConfig) throw new Error(`Model config not found for modelId: ${modelId}`);
      const allowedParams = modelConfig.params;
      const falInput = {};
      
      // Map common parameters
      for (const key of allowedParams) {
        if (key in input && input[key] !== undefined) {
          falInput[key] = input[key];
        }
      }
      
      // Set defaults based on model
      if (modelId === 'fal-ai/kling-video/v2/master/text-to-video') {
        if (!falInput.duration) falInput.duration = '5';
        if (!falInput.aspect_ratio) falInput.aspect_ratio = '16:9';
        if (!falInput.negative_prompt) falInput.negative_prompt = 'blur, distort, and low quality';
        if (!falInput.cfg_scale) falInput.cfg_scale = 0.5;
      } else if (modelId === 'fal-ai/bytedance/seedance/v1/pro/text-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = '16:9';
        if (!falInput.resolution) falInput.resolution = '1080p';
        if (!falInput.duration) falInput.duration = '5';
        if (!falInput.camera_fixed) falInput.camera_fixed = false;
      }
      
      logger.info('Generating video with Fal.ai', {
        modelId,
        jobId,
        input: { ...falInput, prompt: falInput.prompt?.substring(0, 100) + '...' }
      });

      const result = await fal.subscribe(modelId, {
        input: falInput,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS' && update.logs) {
            update.logs.map((log) => log.message).forEach(logger.info);
          }
        }
      });

      return this.processResult(result, jobId);
    } catch (err) {
      logger.error('[Fal.ai API ERROR][TextToVideoService]', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        falResponse: err.response ? {
          status: err.response.status,
          data: err.response.data
        } : undefined,
        fullError: err
      });
      throw this.handleError(err, jobId, modelId);
    }
  }

  processResult(result, jobId) {
    if (!result || !result.data) {
      throw new Error('No result data from Fal.ai');
    }
    
    const { video, task_id, seed } = result.data;
    return {
      jobId,
      taskId: task_id,
      videoUrl: video && video.url,
      seed: seed,
      raw: result.data
    };
  }

  extractAssetUrls(result) {
    const urls = [];
    if (result.videoUrl) urls.push(result.videoUrl);
    return urls;
  }

  generateFileName(index = 0) {
    return `textToVideo_asset_${index}.mp4`;
  }

  getAssetType() {
    return 'video';
  }

  getModelsByCategory() {
    const costEffective = this.supportedModels.filter(m => m.category === 'cost-effective');
    const economical = this.supportedModels.filter(m => m.category === 'economical');
    
    return {
      costEffective,
      economical,
      all: this.supportedModels
    };
  }

  validateModelSpecificInputs(modelId, input) {
    const model = this.findModel(modelId);
    const errors = [];
    const warnings = [];
    if (!model) {
      errors.push(`Model ${modelId} not supported`);
      return { isValid: false, errors, warnings };
    }
    // Check required fields for each model
    if (model.id === 'fal-ai/kling-video/v2/master/text-to-video') {
      if (!input.prompt || typeof input.prompt !== 'string' || !input.prompt.trim()) {
        errors.push('Prompt is required');
      }
      // Add more checks as needed
    } else if (model.id === 'fal-ai/bytedance/seedance/v1/pro/text-to-video') {
      if (!input.prompt || typeof input.prompt !== 'string' || !input.prompt.trim()) {
        errors.push('Prompt is required');
      }
      // Add more checks as needed
    }
    return { isValid: errors.length === 0, errors, warnings };
  }
}

module.exports = new TextToVideoService(); 