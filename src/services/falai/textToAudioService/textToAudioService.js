const BaseFalaiService = require('../BaseFalaiService');
const { fal } = require('@fal-ai/client');
const logger = require('../../../utils/logger');

const SUPPORTED_MODELS = [
  {
    id: 'fal-ai/lyria2',
    name: 'Lyria 2 Text-to-Music',
    description: "Generate music using Google's Lyria 2 text-to-music model.",
    category: 'music',
    params: ['prompt', 'negative_prompt', 'seed']
  },
  {
    id: 'fal-ai/ace-step',
    name: 'ACE-Step Text-to-Audio',
    description: 'Generate audio from text using the ACE-Step model.',
    category: 'music',
    params: ['tags', 'lyrics', 'duration', 'number_of_steps', 'seed', 'scheduler', 'guidance_type', 'granularity_scale', 'guidance_interval', 'guidance_interval_decay', 'guidance_scale', 'minimum_guidance_scale', 'tag_guidance_scale', 'lyric_guidance_scale']
  },
  {
    id: 'fal-ai/ace-step/prompt-to-audio',
    name: 'ACE-Step Prompt-to-Audio',
    description: 'Generate audio from a prompt using the ACE-Step model.',
    category: 'music',
    params: ['prompt', 'instrumental', 'duration', 'number_of_steps', 'seed', 'scheduler', 'guidance_type', 'granularity_scale', 'guidance_interval', 'guidance_interval_decay', 'guidance_scale', 'minimum_guidance_scale', 'tag_guidance_scale', 'lyric_guidance_scale']
  },
  {
    id: 'CassetteAI/music-generator',
    name: 'CassetteAI Music Generator',
    description: 'Generate music from a text prompt using CassetteAI.',
    category: 'music',
    params: ['prompt', 'duration']
  },
  {
    id: 'cassetteai/sound-effects-generator',
    name: 'CassetteAI Sound Effects Generator',
    description: 'Generate high-quality sound effects from a prompt using CassetteAI.',
    category: 'sound',
    params: ['prompt', 'duration']
  },
  {
    id: 'fal-ai/diffrhythm',
    name: 'DiffRhythm',
    description: 'Generate full songs from lyrics using DiffRhythm.',
    category: 'music',
    params: ['lyrics', 'reference_audio_url', 'style_prompt', 'music_duration', 'cfg_strength', 'scheduler', 'num_inference_steps']
  },
  {
    id: 'fal-ai/elevenlabs/sound-effects',
    name: 'ElevenLabs Sound Effects',
    description: 'Generate sound effects using ElevenLabs advanced model.',
    category: 'sound',
    params: ['text', 'duration_seconds', 'prompt_influence']
  },
  {
    id: 'fal-ai/yue',
    name: 'YuE',
    description: 'Generate music from lyrics and genres using YuE.',
    category: 'music',
    params: ['lyrics', 'genres']
  },
  {
    id: 'fal-ai/mmaudio-v2/text-to-audio',
    name: 'MMAudio V2',
    description: 'Generate synchronized audio from text using MMAudio V2.',
    category: 'audio',
    params: ['prompt', 'negative_prompt', 'seed', 'num_steps', 'duration', 'cfg_strength', 'mask_away_clip']
  },
  {
    id: 'fal-ai/minimax-music',
    name: 'MiniMax Music',
    description: 'Generate music from lyrics and reference audio using MiniMax.',
    category: 'music',
    params: ['prompt', 'reference_audio_url']
  }
];

class TextToAudioService extends BaseFalaiService {
  constructor() {
    super();
    this.serviceName = 'textToAudio';
    this.supportedModels = SUPPORTED_MODELS;
  }

  async generateContent(modelId, input = {}, options = {}) {
    logger.info('[TextToAudioService] Entered generateContent', { modelId, input, options });
    // DEBUG: Log input and model config before validation
    const modelConfig = this.supportedModels.find(m => m.id === modelId);
    logger.debug('[TextToAudioService] Model config for validation', { modelId, modelConfig, input });
    if (!modelConfig) {
      logger.error('[TextToAudioService] Model config not found for modelId:', modelId);
      throw new Error(`Model config not found for modelId: ${modelId}`);
    }
    const allowedParams = modelConfig.params; // <-- Move this up before any use
    // Deep debug for YuE model (moved above missing required fields check)
    if (modelId === 'fal-ai/yue') {
      logger.info('[YuE DEBUG] Full input received:', { input });
      logger.info('[YuE DEBUG] Allowed params:', { allowedParams });
      logger.info('[YuE DEBUG] falInput before filter:', { falInput: { ...input } });
      const extraFields = Object.keys(input).filter(k => !allowedParams.includes(k));
      if (extraFields.length > 0) {
        logger.warn('[YuE DEBUG] Extra fields present in input:', { extraFields, input });
      }
      const undefinedFields = allowedParams.filter(k => input[k] === undefined || input[k] === null);
      if (undefinedFields.length > 0) {
        logger.warn('[YuE DEBUG] Undefined or null required fields:', { undefinedFields, input });
      }
    }
    // Validate required fields for this model only
    const missingRequired = allowedParams.filter(
      (param) => !Object.prototype.hasOwnProperty.call(input, param) || input[param] === undefined || input[param] === null
    );
    if (missingRequired.length > 0) {
      logger.error('[TextToAudioService] Missing required fields', { modelId, input, allowedParams, missingRequired });
      throw new Error(`Missing required field(s): ${missingRequired.join(', ')}`);
    }
    const jobId = options.jobId || null;
    try {
      const modelConfig = this.supportedModels.find(m => m.id === modelId);
      if (!modelConfig) {
        logger.error('[TextToAudioService] Model config not found for modelId:', modelId);
        throw new Error(`Model config not found for modelId: ${modelId}`);
      }
      const allowedParams = modelConfig.params;
      const falInput = {};
      for (const key of allowedParams) {
        if (key in input && input[key] !== undefined) {
          falInput[key] = input[key];
        }
      }
      // Set default for negative_prompt if not provided (lyria2 only)
      if (modelId === 'fal-ai/lyria2' && !falInput.negative_prompt) falInput.negative_prompt = 'low quality';
      logger.info('[TextToAudioService] Before fal.subscribe', { modelId, falInput });
      // Filter out undefined/null fields from falInput
      Object.keys(falInput).forEach(key => {
        if (falInput[key] === undefined || falInput[key] === null) {
          delete falInput[key];
        }
      });
      // Deep debug for YuE model
      if (modelId === 'fal-ai/yue') {
        logger.info('[YuE DEBUG] Full input received:', { input });
        logger.info('[YuE DEBUG] Allowed params:', { allowedParams });
        logger.info('[YuE DEBUG] falInput before filter:', { falInput: { ...input } });
        const extraFields = Object.keys(input).filter(k => !allowedParams.includes(k));
        if (extraFields.length > 0) {
          logger.warn('[YuE DEBUG] Extra fields present in input:', { extraFields, input });
        }
        const undefinedFields = allowedParams.filter(k => input[k] === undefined || input[k] === null);
        if (undefinedFields.length > 0) {
          logger.warn('[YuE DEBUG] Allowed params with undefined/null values:', { undefinedFields, input });
        }
      }
      logger.info('[TextToAudioService] Final payload to Fal API', { modelId, falInput });
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
        if (modelId === 'fal-ai/yue') {
          logger.info('[YuE DEBUG] Raw Fal API response:', { result });
        }
        // Handle output for each model
        if (modelId === 'fal-ai/lyria2' && result && result.data && result.data.audio && result.data.audio.url) {
          return { audioUrl: result.data.audio.url, jobId };
        }
        if (modelId === 'fal-ai/ace-step' && result && result.data && result.data.audio && result.data.audio.url) {
          return { audioUrl: result.data.audio.url, seed: result.data.seed, tags: result.data.tags, lyrics: result.data.lyrics, jobId };
        }
        if (modelId === 'CassetteAI/music-generator' && result && result.data && result.data.audio_file && result.data.audio_file.url) {
          return { audioUrl: result.data.audio_file.url, jobId };
        }
        if (modelId === 'fal-ai/ace-step/prompt-to-audio' && result && result.data && result.data.audio && result.data.audio.url) {
          return { audioUrl: result.data.audio.url, seed: result.data.seed, tags: result.data.tags, lyrics: result.data.lyrics, jobId };
        }
        if (modelId === 'cassetteai/sound-effects-generator' && result && result.data && result.data.audio_file && result.data.audio_file.url) {
          return { audioUrl: result.data.audio_file.url, jobId };
        }
        if (modelId === 'fal-ai/diffrhythm' && result && result.data && result.data.audio && result.data.audio.url) {
          return { audioUrl: result.data.audio.url, jobId };
        }
        if (modelId === 'fal-ai/elevenlabs/sound-effects' && result && result.data && result.data.audio && result.data.audio.url) {
          return { audioUrl: result.data.audio.url, jobId };
        }
        if (modelId === 'fal-ai/yue' && result && result.data && result.data.audio && result.data.audio.url) {
          return { audioUrl: result.data.audio.url, jobId };
        }
        if (modelId === 'fal-ai/mmaudio-v2/text-to-audio' && result && result.data && result.data.audio && result.data.audio.url) {
          return { audioUrl: result.data.audio.url, jobId };
        }
        if (modelId === 'fal-ai/minimax-music' && result && result.data && result.data.audio && result.data.audio.url) {
          return { audioUrl: result.data.audio.url, jobId };
        }
        throw new Error('No audio URL returned from Fal.ai');
      } catch (err) {
        if (modelId === 'fal-ai/yue') {
          logger.error('[YuE DEBUG] Fal API error details:', { error: err && err.message, err });
        }
        logger.error('[TextToAudioService] Fal API error', { modelId, falInput, error: err && err.message });
        logger.error('[TextToAudioService] Fal input at error:', { modelId, falInput });
        logger.error('TextToAudioService.generateContent error', err);
        throw err;
      }
    } catch (err) {
      logger.error('[TextToAudioService] In catch block', { modelId, input, err });
      throw err;
    }
  }
}

module.exports = TextToAudioService; 