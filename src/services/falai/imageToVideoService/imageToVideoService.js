const BaseFalaiService = require('../BaseFalaiService');
const { fal } = require('@fal-ai/client');
const logger = require('../../../utils/logger');

const SUPPORTED_MODELS = [
  {
    id: 'fal-ai/veo2/image-to-video',
    name: 'Veo 2 Image-to-Video',
    description: 'Generate videos by animating an input image using Google’s Veo 2 model.',
    category: 'cost-effective',
    params: ['prompt', 'image_url', 'aspect_ratio', 'duration']
  },
  {
    id: 'fal-ai/wan-pro/image-to-video',
    name: 'Wan Pro Image-to-Video',
    description: 'Generate a 6-second 1080p video (at 30 FPS) from an image and text using an enhanced version of Wan 2.1.',
    category: 'cost-effective',
    params: ['prompt', 'image_url', 'seed', 'enable_safety_checker']
  },
  {
    id: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    name: 'Kling 2.1 (std) Image-to-Video',
    description: 'Kling 2.1 (std) Image to Video API.',
    category: 'cost-effective',
    params: ['prompt', 'image_url', 'duration', 'negative_prompt', 'cfg_scale']
  },
  {
    id: 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
    name: 'Seedance 1.0 Lite Image-to-Video',
    description: 'Generate videos from an image and text using Bytedance\'s Seedance 1.0 Lite model.',
    category: 'cost-effective',
    params: ['prompt', 'image_url', 'resolution', 'duration', 'camera_fixed', 'seed', 'end_image_url']
  },
  {
    id: 'fal-ai/minimax/hailuo-02/pro/image-to-video',
    name: 'MiniMax Hailuo-02 (Pro) Image-to-Video',
    description: 'MiniMax Hailuo-02 Image To Video API (Pro, 1080p): Advanced image-to-video generation model with 1080p resolution.',
    category: 'cost-effective',
    params: ['prompt', 'image_url', 'prompt_optimizer']
  },
  {
    id: 'fal-ai/wan-i2v',
    name: 'Wan I2V',
    description: 'Wan I2V: Advanced image-to-video with prompt, negative_prompt, and many controls.',
    category: 'cost-effective',
    params: ['prompt', 'negative_prompt', 'image_url', 'num_frames', 'frames_per_second', 'seed', 'resolution', 'num_inference_steps', 'guide_scale', 'shift', 'enable_safety_checker', 'enable_prompt_expansion', 'acceleration', 'aspect_ratio']
  },
  {
    id: 'fal-ai/pixverse/v4.5/image-to-video',
    name: 'PixVerse V4.5 Image-to-Video',
    description: 'PixVerse V4.5: High quality image-to-video with style, aspect ratio, and resolution options.',
    category: 'cost-effective',
    params: ['prompt', 'image_url', 'aspect_ratio', 'resolution', 'duration', 'negative_prompt', 'style', 'seed']
  },
  {
    id: 'fal-ai/luma-dream-machine/ray-2-flash/image-to-video',
    name: 'Luma Ray2 Image-to-Video',
    description: 'Luma Ray2: State of the art image-to-video with aspect ratio, loop, and resolution options.',
    category: 'cost-effective',
    params: ['prompt', 'image_url', 'end_image_url', 'aspect_ratio', 'loop', 'resolution', 'duration']
  },
  {
    id: 'fal-ai/magi-distilled/image-to-video',
    name: 'Magi Distilled Image-to-Video',
    description: 'Magi Distilled: Generate a video from an image with advanced controls.',
    category: 'cost-effective',
    params: ['prompt', 'image_url', 'num_frames', 'seed', 'resolution', 'num_inference_steps', 'enable_safety_checker', 'aspect_ratio']
  }
];

class ImageToVideoService extends BaseFalaiService {
  constructor() {
    super('imageToVideo', SUPPORTED_MODELS);
  }

  async generateContent(modelId, input = {}, options = {}) {
    console.log('[FORCE DEBUG] Entered generateContent', { modelId, input, options });
    this.validateModelAndInputs(modelId, input, options);
    const jobId = options.jobId || null;
    try {
      const modelConfig = this.supportedModels.find(m => m.id === modelId);
      if (!modelConfig) {
        console.error('[FORCE DEBUG] Model config not found for modelId:', modelId);
        throw new Error(`Model config not found for modelId: ${modelId}`);
      }
      const allowedParams = modelConfig.params;
      const falInput = {};
      for (const key of allowedParams) {
        if (key in input && input[key] !== undefined) {
          falInput[key] = input[key];
        }
      }
      console.log('[FORCE DEBUG] After filtering allowedParams', { allowedParams, falInput });
      // Set model-specific defaults for parameters with allowed values
      if (modelId === 'fal-ai/bytedance/seedance/v1/lite/image-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = '16:9';
      } else if (modelId === 'fal-ai/wan-i2v') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = 'auto';
      } else if (modelId === 'fal-ai/pixverse/v4.5/image-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = '16:9';
      } else if (modelId === 'fal-ai/luma-dream-machine/ray-2-flash/image-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = '16:9';
      } else if (modelId === 'fal-ai/magi-distilled/image-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = 'auto';
      } else if (modelId === 'fal-ai/veo2/image-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = 'auto';
      } else if (modelId === 'fal-ai/wan-pro/image-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = '16:9';
      } else if (modelId === 'fal-ai/kling-video/v2.1/standard/image-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = '16:9';
      } else if (modelId === 'fal-ai/minimax/hailuo-02/pro/image-to-video') {
        if (!falInput.aspect_ratio) falInput.aspect_ratio = '1:1';
      }
      // Repeat for other parameters (resolution, duration, etc) as needed, using model-specific allowed values.
      console.log('[FORCE DEBUG] Before fal.subscribe', { modelId, falInput });
      try {
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
        console.error('[FORCE ERROR] Fal input at error:', JSON.stringify({ modelId, falInput }, null, 2));
        logger.error('ImageToVideoService.generateContent error', err);
        throw err;
      }
    } catch (err) {
      console.error('[FORCE ERROR] In catch block', { modelId, input, err });
      logger.error('ImageToVideoService.generateContent error', err);
      throw err;
    }
  }

  processResult(result, jobId) {
    // Standardize output
    if (result && result.data && result.data.video && result.data.video.url) {
      return { videoUrl: result.data.video.url, jobId };
    }
    throw new Error('No video URL returned from Fal.ai');
  }

  getAssetType() {
    return 'video';
  }
}

module.exports = ImageToVideoService; 