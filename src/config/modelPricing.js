/**
 * Model Pricing Configuration
 * All pricing estimates as of mid-2025
 * MP = Megapixel, sec = per second of video
 */

const MODEL_PRICING = {
    // Text-to-Image Models (10 models)
    'text-to-image': {
        'fal-ai/hidream-i1-full': {
            price: '$0.05/MP',
            source: 'Fal.ai',
            tier: 'premium'
        },
        'fal-ai/ideogram/v2': {
            price: '~$0.05/MP',
            source: 'Estimated (SDXL/medium tier)',
            tier: 'premium'
        },
        'fal-ai/stable-diffusion-v35-large': {
            price: '~$0.035/MP',
            source: 'Fal.ai (SD-3 Medium baseline)',
            tier: 'standard'
        },
        'fal-ai/omnigen-v2': {
            price: '~$0.05/MP',
            source: 'Estimated (premium image generation)',
            tier: 'premium'
        },
        'fal-ai/imagen4/preview': {
            price: '~$0.05/MP',
            source: 'Estimated (Imagen4 standard)',
            tier: 'premium'
        },
        'fal-ai/hidream-i1-fast': {
            price: '~$0.025/MP',
            source: 'Estimated (HiDream-Dev/Fast tier)',
            tier: 'fast'
        },
        'fal-ai/flux-1/schnell': {
            price: '$0.003/MP',
            source: 'Fal.ai (fastest tier)',
            tier: 'budget'
        },
        'fal-ai/imagen4/preview/fast': {
            price: '~$0.025/MP',
            source: 'Estimated (fast variant pricing)',
            tier: 'fast'
        },
        'fal-ai/recraft/v2/text-to-image': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (affordable typography model)',
            tier: 'standard'
        },
        'fal-ai/f-lite/standard': {
            price: '~$0.025/MP',
            source: 'Estimated (efficient lightweight model)',
            tier: 'budget'
        }
    },

    // Text-to-Video Models (10 models)
    'text-to-video': {
        'fal-ai/kling-video/v2/master/text-to-video': {
            price: '~$0.25–0.40/sec',
            source: 'Estimated (high quality)',
            tier: 'premium'
        },
        'fal-ai/bytedance/seedance/v1/pro/text-to-video': {
            price: '~$0.30/sec',
            source: 'Estimated (1080p resolution)',
            tier: 'premium'
        },
        'fal-ai/pixverse/v4/text-to-video/fast': {
            price: '~$0.20/sec',
            source: 'Estimated (fast tier)',
            tier: 'fast'
        },
        'fal-ai/pixverse/v4.5/text-to-video': {
            price: '~$0.20–0.40/sec',
            source: 'Estimated (high quality)',
            tier: 'standard'
        },
        'fal-ai/wan-pro/text-to-video': {
            price: '~$0.20–0.40/sec',
            source: 'Estimated (6-second 1080p)',
            tier: 'standard'
        },
        'fal-ai/luma-dream-machine/ray-2-flash': {
            price: '~$0.40–0.60/sec',
            source: 'Estimated (state of the art)',
            tier: 'premium'
        },
        'fal-ai/pika/v2.2/text-to-video': {
            price: '~$0.30/sec',
            source: 'Estimated (high quality)',
            tier: 'standard'
        },
        'fal-ai/minimax/hailuo-02/standard/text-to-video': {
            price: '~$0.08–0.10/sec',
            source: 'Estimated (lower-res variant)',
            tier: 'budget'
        },
        'fal-ai/veo3': {
            price: '$0.50/sec (audio off), $0.75/sec (audio on)',
            source: 'Fal.ai',
            tier: 'premium'
        },
        'fal-ai/veo2': {
            price: '~$0.40/sec',
            source: 'Estimated (comparable tier)',
            tier: 'premium'
        }
    },

    // Image-to-Video Models (9 models)
    'image-to-video': {
        'fal-ai/veo2/image-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (similar to text-to-video)',
            tier: 'standard'
        },
        'fal-ai/wan-pro/image-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (6-second 1080p)',
            tier: 'standard'
        },
        'fal-ai/kling-video/v2.1/standard/image-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (standard quality)',
            tier: 'standard'
        },
        'fal-ai/bytedance/seedance/v1/lite/image-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (lite variant)',
            tier: 'budget'
        },
        'fal-ai/minimax/hailuo-02/pro/image-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (pro variant)',
            tier: 'premium'
        },
        'fal-ai/wan-i2v': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (advanced controls)',
            tier: 'standard'
        },
        'fal-ai/pixverse/v4.5/image-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (high quality)',
            tier: 'standard'
        },
        'fal-ai/luma-dream-machine/ray-2-flash/image-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (state of the art)',
            tier: 'premium'
        },
        'fal-ai/magi-distilled/image-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (advanced controls)',
            tier: 'standard'
        }
    },

    // Text-to-Audio Models (10 models)
    'text-to-audio': {
        'fal-ai/lyria2': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (music generation)',
            tier: 'standard'
        },
        'fal-ai/ace-step': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (audio generation)',
            tier: 'standard'
        },
        'CassetteAI/music-generator': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (music generation)',
            tier: 'standard'
        },
        'fal-ai/ace-step/prompt-to-audio': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (prompt-to-audio)',
            tier: 'standard'
        },
        'cassetteai/sound-effects-generator': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (sound effects)',
            tier: 'standard'
        },
        'fal-ai/diffrhythm': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (full songs)',
            tier: 'standard'
        },
        'fal-ai/elevenlabs/sound-effects': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (sound effects)',
            tier: 'standard'
        },
        'fal-ai/yue': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (music from lyrics)',
            tier: 'standard'
        },
        'fal-ai/mmaudio-v2/text-to-audio': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (synchronized audio)',
            tier: 'standard'
        },
        'fal-ai/minimax-music': {
            price: '~$0.05–0.10/1K chars',
            source: 'Estimated (music generation)',
            tier: 'standard'
        }
    },

    // Text-to-Speech Models (9 models)
    'text-to-speech': {
        'resemble-ai/chatterboxhd/text-to-speech': {
            price: '~$0.05–0.08/1K chars',
            source: 'Estimated (high-quality TTS)',
            tier: 'standard'
        },
        'fal-ai/orpheus-tts': {
            price: '~$0.05–0.08/1K chars',
            source: 'Estimated (expressive TTS)',
            tier: 'standard'
        },
        'fal-ai/minimax/speech-02-hd': {
            price: '~$0.05–0.08/1K chars',
            source: 'Estimated (HD TTS)',
            tier: 'premium'
        },
        'fal-ai/dia-tts': {
            price: '~$0.05–0.08/1K chars',
            source: 'Estimated (dialogue TTS)',
            tier: 'standard'
        },
        'fal-ai/minimax/voice-clone': {
            price: '~$0.05–0.08/1K chars',
            source: 'Estimated (voice cloning)',
            tier: 'premium'
        },
        'fal-ai/playai/tts/v3': {
            price: '~$0.05–0.08/1K chars',
            source: 'Estimated (voice presets)',
            tier: 'standard'
        },
        'fal-ai/elevenlabs/tts/turbo-v2.5': {
            price: '~$0.05–0.08/1K chars',
            source: 'Estimated (multi-language)',
            tier: 'standard'
        },
        'fal-ai/minimax/speech-02-turbo': {
            price: '$0.06/1K chars',
            source: 'Community pricing database',
            tier: 'fast'
        },
        'fal-ai/chatterbox/text-to-speech': {
            price: '~$0.05–0.08/1K chars',
            source: 'Estimated (emotive TTS)',
            tier: 'standard'
        }
    },

    // Image-to-Image Models (10 models)
    'image-to-image': {
        'fal-ai/image-editing/background-change': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (similar to text-to-image)',
            tier: 'standard'
        },
        'fal-ai/image-editing/face-enhancement': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (professional retouching)',
            tier: 'standard'
        },
        'fal-ai/image-editing/color-correction': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (color grading)',
            tier: 'standard'
        },
        'fal-ai/post-processing/sharpen': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (sharpening effects)',
            tier: 'standard'
        },
        'fal-ai/image-editing/object-removal': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (object removal)',
            tier: 'standard'
        },
        'fal-ai/flux/dev/image-to-image': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (high-quality transformation)',
            tier: 'standard'
        },
        'fal-ai/recraft/v3/image-to-image': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (advanced editing)',
            tier: 'standard'
        },
        'fal-ai/luma-photon/modify': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (creative editing)',
            tier: 'standard'
        },
        'fal-ai/bytedance/seededit/v3/edit-image': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (accurate editing)',
            tier: 'standard'
        },
        'fal-ai/flux-pro/kontext/max/multi': {
            price: '~$0.025–0.05/MP',
            source: 'Estimated (premium editing)',
            tier: 'premium'
        }
    },

    // Video-to-Video Models (10 models)
    'video-to-video': {
        'fal-ai/luma-dream-machine/ray-2/modify': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (similar to text-to-video)',
            tier: 'premium'
        },
        'fal-ai/wan-vace-14b': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (inpainting)',
            tier: 'standard'
        },
        'fal-ai/ltx-video-13b-distilled/multiconditioning': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (multiconditioning)',
            tier: 'standard'
        },
        'fal-ai/magi/extend-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (video extension)',
            tier: 'standard'
        },
        'fal-ai/pixverse/lipsync': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (lipsync)',
            tier: 'standard'
        },
        'fal-ai/pixverse/extend/fast': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (fast extension)',
            tier: 'fast'
        },
        'fal-ai/fast-animatediff/turbo/video-to-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (turbo video-to-video)',
            tier: 'fast'
        },
        'fal-ai/video-upscaler': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (upscaling)',
            tier: 'standard'
        },
        'fal-ai/amt-interpolation': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (frame interpolation)',
            tier: 'standard'
        },
        'fal-ai/ffmpeg-api/merge-audio-video': {
            price: '~$0.20–0.50/sec',
            source: 'Estimated (audio-video merge)',
            tier: 'standard'
        }
    },

    // Image-to-3D Models (10 models)
    'image-to-3d': {
        'tripo3d/tripo/v2.5/image-to-3d': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (3D generation)',
            tier: 'premium'
        },
        'fal-ai/hunyuan3d-v21': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (Tencent 3D)',
            tier: 'premium'
        },
        'fal-ai/hyper3d/rodin': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (Hyper3D)',
            tier: 'premium'
        },
        'fal-ai/trellis': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (Trellis 3D)',
            tier: 'premium'
        },
        'tripo3d/tripo/v2.5/multiview-to-3d': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (multiview 3D)',
            tier: 'premium'
        },
        'fal-ai/hunyuan3d/v2/multi-view': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (multi-view 3D)',
            tier: 'premium'
        },
        'fal-ai/trellis/multi': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (multi-image 3D)',
            tier: 'premium'
        },
        'fal-ai/hunyuan3d/v2': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (Hunyuan3D v2)',
            tier: 'premium'
        },
        'fal-ai/hunyuan3d/v2/turbo': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (turbo 3D)',
            tier: 'premium'
        },
        'fal-ai/triposr': {
            price: '~$0.05–0.10/output',
            source: 'Estimated (TripoSR)',
            tier: 'premium'
        }
    }
};

/**
 * Get pricing information for a specific model
 * @param {string} operation - The operation type (e.g., 'text-to-image')
 * @param {string} modelId - The model ID
 * @returns {Object|null} Pricing information or null if not found
 */
function getModelPricing(operation, modelId) {
    const operationPricing = MODEL_PRICING[operation];
    if (!operationPricing) return null;
    
    return operationPricing[modelId] || null;
}

/**
 * Get pricing information for all models in an operation
 * @param {string} operation - The operation type
 * @returns {Object} All pricing information for the operation
 */
function getOperationPricing(operation) {
    return MODEL_PRICING[operation] || {};
}

/**
 * Format pricing for display
 * @param {Object} pricing - Pricing information object
 * @returns {string} Formatted pricing string
 */
function formatPricing(pricing) {
    if (!pricing) return 'Pricing not available';
    
    const tierEmoji = {
        'budget': '💰',
        'fast': '⚡',
        'standard': '📊',
        'premium': '💎'
    };
    
    const emoji = tierEmoji[pricing.tier] || '💵';
    return `${emoji} ${pricing.price}`;
}

module.exports = {
    MODEL_PRICING,
    getModelPricing,
    getOperationPricing,
    formatPricing
}; 