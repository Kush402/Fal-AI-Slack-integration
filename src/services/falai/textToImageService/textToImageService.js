const { fal } = require('@fal-ai/client');
const logger = require('../../../utils/logger');

// Configure Fal.ai API key securely
if (!process.env.FAL_KEY) {
    logger.error('FAL_KEY environment variable is not set');
    throw new Error('FAL_KEY environment variable is required for fal.ai integration');
}

fal.config({ credentials: process.env.FAL_KEY });

const MODEL_PARAM_MAP = {
  'fal-ai/hidream-i1-full': [
    'prompt', 'negative_prompt', 'image_size', 'num_inference_steps', 'seed', 'guidance_scale', 'sync_mode', 'num_images', 'enable_safety_checker', 'output_format', 'loras'
  ],
  'fal-ai/ideogram/v2': [
    'prompt', 'aspect_ratio', 'expand_prompt', 'style', 'seed', 'sync_mode', 'negative_prompt', 'num_images', 'enable_safety_checker', 'output_format'
  ],
  'fal-ai/stable-diffusion-v35-large': [
    'prompt', 'negative_prompt', 'num_inference_steps', 'seed', 'guidance_scale', 'sync_mode', 'num_images', 'enable_safety_checker', 'output_format', 'controlnet', 'image_size', 'loras', 'ip_adapter'
  ],
  'fal-ai/omnigen-v2': [
    'prompt', 'input_image_urls', 'image_size', 'num_inference_steps', 'seed', 'text_guidance_scale', 'image_guidance_scale', 'negative_prompt', 'cfg_range_start', 'cfg_range_end', 'scheduler', 'sync_mode', 'num_images', 'enable_safety_checker', 'output_format'
  ],
  'fal-ai/imagen4/preview': [
    'prompt', 'negative_prompt', 'aspect_ratio', 'num_images', 'seed'
  ],
  'fal-ai/hidream-i1-fast': [
    'prompt', 'negative_prompt', 'image_size', 'num_inference_steps', 'seed', 'sync_mode', 'num_images', 'enable_safety_checker', 'output_format'
  ],
  'fal-ai/flux-1/schnell': [
    'prompt', 'image_size', 'num_inference_steps', 'seed', 'sync_mode', 'num_images', 'enable_safety_checker', 'output_format', 'acceleration'
  ],
  'fal-ai/imagen4/preview/fast': [
    'prompt', 'negative_prompt', 'aspect_ratio', 'num_images', 'seed'
  ],
  'fal-ai/recraft/v2/text-to-image': [
    'prompt', 'image_size', 'style', 'colors', 'style_id', 'enable_safety_checker'
  ],
  'fal-ai/f-lite/standard': [
    'prompt', 'negative_prompt', 'image_size', 'num_inference_steps', 'seed', 'guidance_scale', 'sync_mode', 'num_images', 'enable_safety_checker'
  ]
};

class TextToImageService {
  async generate(prompt, parameters = {}, sessionId = null) {
    try {
      const modelId = parameters.modelId || 'fal-ai/ideogram/v2';
      const allowedParams = MODEL_PARAM_MAP[modelId] || MODEL_PARAM_MAP['fal-ai/ideogram/v2'];
      // Build input object for the selected model
      const input = { prompt };
      for (const key of allowedParams) {
        if (key in parameters && parameters[key] !== undefined) {
          input[key] = parameters[key];
        }
      }
      // Some models require special mapping for aspect_ratio/image_size
      if (modelId === 'fal-ai/ideogram/v2' || modelId === 'fal-ai/imagen4/preview' || modelId === 'fal-ai/imagen4/preview/fast') {
        if (parameters.aspect_ratio) input.aspect_ratio = parameters.aspect_ratio;
      }
      if (modelId.startsWith('fal-ai/hidream-i1') || modelId === 'fal-ai/stable-diffusion-v35-large' || modelId === 'fal-ai/omnigen-v2' || modelId === 'fal-ai/flux-1/schnell' || modelId === 'fal-ai/f-lite/standard' || modelId === 'fal-ai/recraft/v2/text-to-image') {
        if (parameters.image_size) input.image_size = parameters.image_size;
      }
      // Call the Fal API
      const result = await fal.subscribe(modelId, {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS' && update.logs) {
            update.logs.map((log) => log.message).forEach((message) => {
              logger.debug('Fal.ai queue update:', message);
            });
          }
        }
      });
      logger.debug('Fal.ai result received');
      // Return only the first hosted image URL (assetUrl)
      const images = result.data && result.data.images ? result.data.images : [];
      const assetUrl = images.length > 0 && images[0].url ? images[0].url : null;
      return { assetUrl };
    } catch (err) {
      logger.error('TextToImageService error:', err);
      throw err;
    }
  }
}

module.exports = new TextToImageService(); 