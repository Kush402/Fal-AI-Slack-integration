const BaseFalaiService = require('../BaseFalaiService');
const { fal } = require('@fal-ai/client');
const logger = require('../../../utils/logger');

class TextToSpeechService extends BaseFalaiService {
    constructor() {
        super();
        // Supported TTS models from modelinfo.txt
        this.supportedModels = [
            {
                id: 'resemble-ai/chatterboxhd/text-to-speech',
                name: 'ChatterboxHD TTS',
                description: 'High-quality TTS with voice selection, emotion, and more.',
                params: ['text', 'voice', 'audio_url', 'exaggeration', 'cfg', 'high_quality_audio', 'seed', 'temperature']
            },
            {
                id: 'fal-ai/orpheus-tts',
                name: 'Orpheus TTS',
                description: 'Expressive TTS with emotive tags and voice selection.',
                params: ['text', 'voice', 'temperature', 'repetition_penalty']
            },
            {
                id: 'fal-ai/minimax/speech-02-hd',
                name: 'MiniMax Speech 02 HD',
                description: 'HD TTS with advanced voice and audio settings.',
                params: ['text', 'voice_setting', 'audio_setting', 'language_boost', 'output_format', 'pronunciation_dict']
            },
            {
                id: 'fal-ai/dia-tts',
                name: 'Dia Dialogue TTS',
                description: 'Dialogue TTS for multi-speaker scripts.',
                params: ['text']
            },
            {
                id: 'fal-ai/minimax/voice-clone',
                name: 'MiniMax Voice Clone',
                description: 'Clone a voice from an audio URL and generate TTS.',
                params: ['audio_url', 'noise_reduction', 'need_volume_normalization', 'accuracy', 'text', 'model']
            },
            {
                id: 'fal-ai/playai/tts/v3',
                name: 'PlayAI TTS v3',
                description: 'PlayAI TTS with voice presets and reproducibility.',
                params: ['input', 'voice', 'response_format', 'seed']
            },
            {
                id: 'fal-ai/elevenlabs/tts/turbo-v2.5',
                name: 'ElevenLabs Turbo v2.5',
                description: 'ElevenLabs TTS with multi-language and voice control.',
                params: ['text', 'voice', 'stability', 'similarity_boost', 'style', 'speed', 'timestamps', 'previous_text', 'next_text', 'language_code']
            },
            {
                id: 'fal-ai/minimax/speech-02-turbo',
                name: 'MiniMax Speech 02 Turbo',
                description: 'Turbo TTS for fast, high-quality speech.',
                params: ['text', 'voice_setting', 'audio_setting', 'language_boost', 'output_format', 'pronunciation_dict']
            },
            {
                id: 'fal-ai/chatterbox/text-to-speech',
                name: 'Chatterbox TTS',
                description: 'Chatterbox TTS with emotive tags and reference audio.',
                params: ['text', 'audio_url', 'exaggeration', 'temperature', 'cfg', 'seed']
            }
        ];
    }

    // Map generic params to model-specific input
    mapParams(modelId, params) {
        switch (modelId) {
            case 'resemble-ai/chatterboxhd/text-to-speech':
                return {
                    text: params.text,
                    voice: params.voice,
                    audio_url: params.audio_url,
                    exaggeration: params.exaggeration,
                    cfg: params.cfg,
                    high_quality_audio: params.high_quality_audio,
                    seed: params.seed,
                    temperature: params.temperature
                };
            case 'fal-ai/orpheus-tts':
                return {
                    text: params.text,
                    voice: params.voice,
                    temperature: params.temperature,
                    repetition_penalty: params.repetition_penalty
                };
            case 'fal-ai/minimax/speech-02-hd':
            case 'fal-ai/minimax/speech-02-turbo':
                return {
                    text: params.text,
                    voice_setting: params.voice_setting,
                    audio_setting: params.audio_setting,
                    language_boost: params.language_boost,
                    output_format: params.output_format,
                    pronunciation_dict: params.pronunciation_dict
                };
            case 'fal-ai/dia-tts':
                return {
                    text: params.text
                };
            case 'fal-ai/minimax/voice-clone':
                return {
                    audio_url: params.audio_url,
                    noise_reduction: params.noise_reduction,
                    need_volume_normalization: params.need_volume_normalization,
                    accuracy: params.accuracy,
                    text: params.text,
                    model: params.model
                };
            case 'fal-ai/playai/tts/v3':
                return {
                    input: params.text, // Map 'text' to 'input' for PlayAI
                    voice: params.voice || 'Jennifer (English (US)/American)', // Default voice if not provided
                    response_format: params.response_format,
                    seed: params.seed
                };
            case 'fal-ai/elevenlabs/tts/turbo-v2.5':
                return {
                    text: params.text,
                    voice: params.voice,
                    stability: params.stability,
                    similarity_boost: params.similarity_boost,
                    style: params.style,
                    speed: params.speed,
                    timestamps: params.timestamps,
                    previous_text: params.previous_text,
                    next_text: params.next_text,
                    language_code: params.language_code
                };
            case 'fal-ai/chatterbox/text-to-speech':
                return {
                    text: params.text,
                    audio_url: params.audio_url,
                    exaggeration: params.exaggeration,
                    temperature: params.temperature,
                    cfg: params.cfg,
                    seed: params.seed
                };
            default:
                return params;
        }
    }

    async generateContent({ modelId, params }) {
        try {
            // Filter out operation and modelId from params
            const filteredParams = { ...params };
            delete filteredParams.operation;
            delete filteredParams.modelId;
            const input = this.mapParams(modelId, filteredParams);
            logger.info(`[TTS] Generating with model ${modelId} and input:`, input);
            const result = await fal.subscribe(modelId, {
                input,
                logs: true
            });
            return {
                audio: result.data?.audio?.url || result.data?.audio_url || null,
                requestId: result.requestId,
                raw: result.data
            };
        } catch (error) {
            logger.error(`[TTS] Generation failed for model ${modelId}:`, error);
            throw error;
        }
    }
}

module.exports = TextToSpeechService; 