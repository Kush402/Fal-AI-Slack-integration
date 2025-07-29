const BaseFalaiService = require('../BaseFalaiService');
const { fal } = require('@fal-ai/client');
const logger = require('../../../utils/logger');

// Utility to remove undefined/null fields from params
function cleanParams(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(
            ([_, v]) =>
                v !== undefined &&
                v !== null &&
                !(Array.isArray(v) && v.length === 0)
        )
    );
}

class VideoToVideoService extends BaseFalaiService {
    constructor() {
        const supportedModels = [
            {
                id: 'fal-ai/luma-dream-machine/ray-2/modify',
                name: 'Ray2 Modify Video',
                description: 'Ray2 Modify is a video generative model capable of restyling or retexturing the entire shot.',
                params: ['video_url', 'image_url', 'prompt', 'mode']
            },
            {
                id: 'fal-ai/wan-vace-14b',
                name: 'Wan VACE 14B',
                description: 'Endpoint for inpainting a video from all supported sources.',
                params: [
                    'prompt', 'negative_prompt', 'match_input_num_frames', 'num_frames', 'match_input_frames_per_second',
                    'frames_per_second', 'task', 'seed', 'resolution', 'aspect_ratio', 'num_inference_steps',
                    'guidance_scale', 'video_url', 'mask_video_url', 'mask_image_url', 'ref_image_urls',
                    'enable_safety_checker', 'enable_prompt_expansion', 'preprocess', 'acceleration'
                ]
            },
            // 8 new models
            {
                id: 'fal-ai/ltx-video-13b-distilled/multiconditioning',
                name: 'LTX Video 13B Multiconditioning',
                description: 'Generate a video from a prompt and any number of images and video.',
                params: [
                    'prompt', 'negative_prompt', 'loras', 'resolution', 'aspect_ratio', 'seed', 'num_frames',
                    'first_pass_num_inference_steps', 'first_pass_skip_final_steps', 'second_pass_num_inference_steps',
                    'second_pass_skip_initial_steps', 'frame_rate', 'expand_prompt', 'reverse_video',
                    'enable_safety_checker', 'constant_rate_factor', 'images', 'videos'
                ]
            },
            {
                id: 'fal-ai/magi/extend-video',
                name: 'Magi Extend Video',
                description: 'Generate a video extension.',
                params: [
                    'prompt', 'video_url', 'num_frames', 'start_frame', 'seed', 'resolution', 'num_inference_steps',
                    'enable_safety_checker', 'aspect_ratio'
                ]
            },
            {
                id: 'fal-ai/pixverse/lipsync',
                name: 'Pixverse Lipsync',
                description: 'Create a lipsync video by combining a video with audio.',
                params: [
                    'video_url', 'audio_url', 'voice_id', 'text'
                ]
            },
            {
                id: 'fal-ai/pixverse/extend/fast',
                name: 'Pixverse Extend Fast',
                description: 'Extend a video by generating new content based on its ending using fast mode.',
                params: [
                    'video_url', 'prompt', 'negative_prompt', 'style', 'resolution', 'model', 'seed'
                ]
            },
            {
                id: 'fal-ai/fast-animatediff/turbo/video-to-video',
                name: 'Fast AnimateDiff Turbo Video-to-Video',
                description: 'Turbo Video To Video.',
                params: [
                    'video_url', 'first_n_seconds', 'prompt', 'negative_prompt', 'num_inference_steps', 'strength',
                    'guidance_scale', 'seed', 'fps', 'motions'
                ]
            },
            {
                id: 'fal-ai/video-upscaler',
                name: 'Video Upscaler',
                description: 'Upscale a video.',
                params: [
                    'video_url', 'scale'
                ]
            },
            {
                id: 'fal-ai/amt-interpolation',
                name: 'AMT Interpolation',
                description: 'Interpolate video frames.',
                params: [
                    'video_url', 'output_fps', 'recursive_interpolation_passes'
                ]
            },
            {
                id: 'fal-ai/ffmpeg-api/merge-audio-video',
                name: 'FFmpeg Merge Audio Video',
                description: 'Combine video and audio into a single file.',
                params: [
                    'video_url', 'audio_url', 'start_offset'
                ]
            }
        ];
        super('videoToVideo', supportedModels);
        this.supportedModels = supportedModels;
    }

    mapParams(modelId, params) {
        // Normalize modelId for matching
        const normalizedModelId = typeof modelId === 'string' ? modelId.trim() : '';
        switch (normalizedModelId) {
            case 'fal-ai/luma-dream-machine/ray-2/modify':
                // mode: adhere_1, adhere_2, adhere_3, flex_1, flex_2, flex_3, reimagine_1, reimagine_2, reimagine_3
                const validModes = [
                  'adhere_1', 'adhere_2', 'adhere_3',
                  'flex_1', 'flex_2', 'flex_3',
                  'reimagine_1', 'reimagine_2', 'reimagine_3'
                ];
                let mode = validModes.includes(params.mode) ? params.mode : 'flex_1';
                return cleanParams({
                    video_url: params.video_url,
                    image_url: params.image_url,
                    prompt: params.prompt,
                    mode
                });
            case 'fal-ai/wan-vace-14b': {
                // resolution: 480p, 580p, 720p
                const validRes = ['480p', '580p', '720p'];
                let res = validRes.includes(params.resolution) ? params.resolution : '720p';
                // aspect_ratio: auto, 16:9, 1:1, 9:16
                const validAR = ['auto', '16:9', '1:1', '9:16'];
                let ar = validAR.includes(params.aspect_ratio) ? params.aspect_ratio : 'auto';
                return cleanParams({
                    prompt: params.prompt,
                    negative_prompt: params.negative_prompt,
                    match_input_num_frames: params.match_input_num_frames,
                    num_frames: params.num_frames,
                    match_input_frames_per_second: params.match_input_frames_per_second,
                    frames_per_second: params.frames_per_second,
                    task: params.task,
                    seed: params.seed,
                    resolution: res,
                    aspect_ratio: ar,
                    num_inference_steps: params.num_inference_steps,
                    guidance_scale: params.guidance_scale,
                    video_url: params.video_url,
                    mask_video_url: params.mask_video_url,
                    mask_image_url: params.mask_image_url,
                    ref_image_urls: params.ref_image_urls,
                    enable_safety_checker: params.enable_safety_checker,
                    enable_prompt_expansion: params.enable_prompt_expansion,
                    preprocess: params.preprocess,
                    acceleration: params.acceleration
                });
            }
            case 'fal-ai/ltx-video-13b-distilled/multiconditioning': {
                // resolution: 480p, 720p
                const validRes = ['480p', '720p'];
                let res = validRes.includes(params.resolution) ? params.resolution : '720p';
                // aspect_ratio: 9:16, 1:1, 16:9, auto
                const validAR = ['9:16', '1:1', '16:9', 'auto'];
                let ar = validAR.includes(params.aspect_ratio) ? params.aspect_ratio : 'auto';
                // Map images/videos to array of objects as required by API
                const images = (params.images || []).map(url => ({ image_url: url }));
                const videos = (params.videos || []).map(url => ({ video_url: url }));
                return cleanParams({
                    prompt: params.prompt,
                    negative_prompt: params.negative_prompt,
                    loras: params.loras || [],
                    resolution: res,
                    aspect_ratio: ar,
                    seed: params.seed,
                    num_frames: params.num_frames || 121,
                    first_pass_num_inference_steps: params.first_pass_num_inference_steps || 8,
                    first_pass_skip_final_steps: params.first_pass_skip_final_steps || 1,
                    second_pass_num_inference_steps: params.second_pass_num_inference_steps || 8,
                    second_pass_skip_initial_steps: params.second_pass_skip_initial_steps || 5,
                    frame_rate: params.frame_rate || 30,
                    expand_prompt: params.expand_prompt || false,
                    reverse_video: params.reverse_video || false,
                    enable_safety_checker: params.enable_safety_checker !== false,
                    constant_rate_factor: params.constant_rate_factor || 35,
                    images,
                    videos
                });
            }
            case 'fal-ai/magi/extend-video': {
                let validRes = ['480p', '720p'];
                let res = validRes.includes(params.resolution) ? params.resolution : '720p';
                // aspect_ratio: auto, 16:9, 9:16, 1:1
                const validAR = ['auto', '16:9', '9:16', '1:1'];
                let ar = validAR.includes(params.aspect_ratio) ? params.aspect_ratio : 'auto';
                return cleanParams({
                    prompt: params.prompt,
                    video_url: params.video_url,
                    num_frames: params.num_frames || 96,
                    start_frame: params.start_frame,
                    seed: params.seed,
                    resolution: res,
                    num_inference_steps: params.num_inference_steps || 16,
                    enable_safety_checker: params.enable_safety_checker !== false,
                    aspect_ratio: ar
                });
            }
            case 'fal-ai/pixverse/lipsync':
                return cleanParams({
                    video_url: params.video_url,
                    audio_url: params.audio_url,
                    voice_id: params.voice_id,
                    text: params.text
                });
            case 'fal-ai/pixverse/extend/fast': {
                // resolution: 360p, 540p, 720p
                const validRes = ['360p', '540p', '720p'];
                let res = validRes.includes(params.resolution) ? params.resolution : '720p';
                // style: anime, 3d_animation, day, cyberpunk, comic
                const validStyle = ['anime', '3d_animation', 'day', 'cyberpunk', 'comic'];
                let style = validStyle.includes(params.style) ? params.style : undefined;
                // model: v3.5, v4, v4.5
                const validModel = ['v3.5', 'v4', 'v4.5'];
                let model = validModel.includes(params.model) ? params.model : 'v4.5';
                return cleanParams({
                    video_url: params.video_url,
                    prompt: params.prompt,
                    negative_prompt: params.negative_prompt || '',
                    style,
                    resolution: res,
                    model,
                    seed: params.seed
                });
            }
            case 'fal-ai/fast-animatediff/turbo/video-to-video': {
                // No strict enums, but could add if needed
                return cleanParams({
                    video_url: params.video_url,
                    first_n_seconds: params.first_n_seconds,
                    prompt: params.prompt,
                    negative_prompt: params.negative_prompt,
                    num_inference_steps: params.num_inference_steps,
                    strength: params.strength,
                    guidance_scale: params.guidance_scale,
                    seed: params.seed,
                    fps: params.fps,
                    motions: params.motions
                });
            }
            case 'fal-ai/video-upscaler': {
                // scale: 2, 3, 4
                const validScale = ['2', '3', '4'];
                let scale = validScale.includes(params.scale) ? params.scale : '2';
                return cleanParams({
                    video_url: params.video_url,
                    scale
                });
            }
            case 'fal-ai/amt-interpolation':
                return cleanParams({
                    video_url: params.video_url,
                    output_fps: params.output_fps,
                    recursive_interpolation_passes: params.recursive_interpolation_passes
                });
            case 'fal-ai/ffmpeg-api/merge-audio-video':
                return cleanParams({
                    video_url: params.video_url,
                    audio_url: params.audio_url,
                    start_offset: params.start_offset
                });
            // Add stubs for any known but not yet implemented models
            // case 'fal-ai/NEW-MODEL-ID-HERE':
            //     throw new Error('Model implementation missing for: ' + normalizedModelId);
            default:
                // Log and throw explicit error for unknown modelId
                console.error(`[VideoToVideoService] Unknown or unsupported modelId: ${normalizedModelId}`);
                throw new Error(`Unknown or unsupported modelId: ${normalizedModelId}`);
        }
    }

    async generateContent({ modelId, params }) {
        const mappedParams = this.mapParams(modelId, params);
        // Per-model required field validation
        const modelRequiredFields = {
            'fal-ai/luma-dream-machine/ray-2/modify': ['video_url'],
            'fal-ai/wan-vace-14b': ['video_url'],
            'fal-ai/ltx-video-13b-distilled/multiconditioning': ['videosOrImages'],
            'fal-ai/magi/extend-video': ['video_url'],
            'fal-ai/pixverse/lipsync': ['video_url'],
            'fal-ai/pixverse/extend/fast': ['video_url'],
            'fal-ai/fast-animatediff/turbo/video-to-video': ['video_url'],
            'fal-ai/video-upscaler': ['video_url'],
            'fal-ai/amt-interpolation': ['video_url'],
            'fal-ai/ffmpeg-api/merge-audio-video': ['video_url', 'audio_url']
        };
        const required = modelRequiredFields[modelId] || [];
        let missing = [];
        for (const field of required) {
            if (field === 'videosOrImages') {
                // For LTX, at least one of videos or images must be non-empty
                if ((!mappedParams.videos || mappedParams.videos.length === 0) && (!mappedParams.images || mappedParams.images.length === 0)) {
                    missing.push('videos or images');
                }
            } else if (!mappedParams[field]) {
                missing.push(field);
            }
        }
        if (missing.length > 0) {
            throw new Error(`Missing required parameter(s) for ${modelId}: ${missing.join(', ')}`);
        }
        // Use fal.subscribe for all video-to-video models for robust async handling
        const useSubscribe = [
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
        ];

        if (useSubscribe.includes(modelId)) {
            try {
                logger.debug('[VideoToVideoService] Submitting to Fal.ai via subscribe', {
                    modelId,
                    mappedParams: JSON.stringify(mappedParams, null, 2)
                });
                const result = await fal.subscribe(modelId, {
                    input: mappedParams,
                    logs: true,
                    onQueueUpdate: (update) => {
                        if (update.logs && update.logs.length > 0) {
                            logger.debug('[VideoToVideoService][Fal.ai Logs]', update.logs.map(l => l.message).join('\n'));
                        }
                        if (update.status) {
                            logger.debug(`[VideoToVideoService][Fal.ai Status] ${update.status} (request_id: ${update.request_id})`);
                        }
                    }
                });
                logger.debug('[VideoToVideoService] Fal.ai subscribe result',
                    JSON.stringify(result, null, 2).length > 1000
                        ? JSON.stringify({ summary: 'Result too large, see logs for details', keys: Object.keys(result) }, null, 2)
                        : JSON.stringify(result, null, 2)
                );
                let videoUrl = null;
                if (result && result.data && result.data.video && result.data.video.url) {
                    videoUrl = result.data.video.url;
                }
                if (!videoUrl || !videoUrl.startsWith('http')) {
                    throw new Error('fal.ai async result did not return a hosted video URL. Only hosted URLs are supported.');
                }
                return { videoUrl };
            } catch (err) {
                logger.error('[VideoToVideoService] Fal.ai subscribe error', {
                    modelId,
                    params: JSON.stringify(params, null, 2),
                    error: err && err.stack ? err.stack : err
                });
                throw new Error('Failed to generate video-to-video asset with fal.subscribe: ' + (err && err.message ? err.message : err));
            }
        }
        // Default: use fal.queue.submit for other models
        let requestId;
        try {
            logger.debug('[VideoToVideoService] Submitting to Fal.ai via queue.submit', { modelId, mappedParams });
            const submitResult = await fal.queue.submit(modelId, {
                input: mappedParams
            });
            requestId = submitResult.request_id;
            if (!requestId) {
                throw new Error('fal.ai did not return a request_id for async queue submission.');
            }
        } catch (err) {
            logger.error('[VideoToVideoService] Failed to submit request', { modelId, params, error: err.message });
            throw new Error('Failed to submit video-to-video request to fal.ai: ' + err.message);
        }

        // Poll for completion
        let status, pollCount = 0;
        const maxPolls = 30;
        const pollIntervalMs = 1000;
        while (pollCount < maxPolls) {
            try {
                status = await fal.queue.status(modelId, {
                    requestId,
                    logs: true
                });
                logger.debug(`[VideoToVideoService] Poll ${pollCount + 1} status:`, status);
                if (status.status === 'COMPLETED') break;
                if (status.status === 'FAILED' || status.status === 'CANCELLED') {
                    logger.error(`[VideoToVideoService] Fal.ai request failed`, status);
                    throw new Error(`fal.ai async request failed with status: ${status.status}`);
                }
            } catch (err) {
                logger.error('[VideoToVideoService] Error polling status', { error: err, requestId });
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
            logger.debug(`[VideoToVideoService] Full fal.ai result for model ${modelId}:`, JSON.stringify(result, null, 2));
        } catch (err) {
            throw new Error('Error fetching fal.ai async result: ' + err.message);
        }

        // Extract hosted video URL from result
        let videoUrl = null;
        if (result && result.data && result.data.video && result.data.video.url) {
            videoUrl = result.data.video.url;
        }
        if (!videoUrl || !videoUrl.startsWith('http')) {
            throw new Error('fal.ai async result did not return a hosted video URL. Only hosted URLs are supported.');
        }
        return { videoUrl };
    }
}

module.exports = VideoToVideoService; 