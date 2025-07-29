const BaseFalaiService = require('../BaseFalaiService');
const { fal } = require('@fal-ai/client');
const logger = require('../../../utils/logger');

class ImageTo3DService extends BaseFalaiService {
    constructor() {
        const supportedModels = [
            {
                id: 'tripo3d/tripo/v2.5/image-to-3d',
                name: 'Tripo3D v2.5 Image-to-3D',
                description: 'Generate a 3D model from a single image using Tripo3D.',
                params: [
                    'image_url', 'seed', 'face_limit', 'pbr', 'texture', 'texture_seed',
                    'auto_size', 'style', 'quad', 'texture_alignment', 'orientation'
                ]
            },
            {
                id: 'fal-ai/hunyuan3d-v21',
                name: 'Hunyuan3D v21',
                description: 'Tencent Hunyuan3D v21 single image to 3D.',
                params: [
                    'input_image_url', 'seed', 'num_inference_steps', 'guidance_scale', 'octree_resolution', 'textured_mesh'
                ]
            },
            {
                id: 'fal-ai/hyper3d/rodin',
                name: 'Hyper3D Rodin',
                description: 'Hyper3D Rodin single/multi image to 3D.',
                params: [
                    'prompt', 'input_image_urls', 'condition_mode', 'seed', 'geometry_file_format', 'material', 'quality', 'use_hyper', 'tier', 'TAPose', 'bbox_condition', 'addons'
                ]
            },
            {
                id: 'fal-ai/trellis',
                name: 'Trellis',
                description: 'Trellis single image to 3D.',
                params: [
                    'image_url', 'seed', 'ss_guidance_strength', 'ss_sampling_steps', 'slat_guidance_strength', 'slat_sampling_steps', 'mesh_simplify', 'texture_size'
                ]
            },
            {
                id: 'tripo3d/tripo/v2.5/multiview-to-3d',
                name: 'Tripo3D v2.5 Multiview-to-3D',
                description: 'Generate a 3D model from multiple views using Tripo3D.',
                params: [
                    'front_image_url', 'left_image_url', 'back_image_url', 'right_image_url', 'seed', 'face_limit', 'pbr', 'texture', 'texture_seed', 'auto_size', 'style', 'quad', 'texture_alignment', 'orientation'
                ]
            },
            {
                id: 'fal-ai/hunyuan3d/v2/multi-view',
                name: 'Hunyuan3D v2 Multi-view',
                description: 'Hunyuan3D v2 multi-view image to 3D.',
                params: [
                    'front_image_url', 'back_image_url', 'left_image_url', 'seed', 'num_inference_steps', 'guidance_scale', 'octree_resolution', 'textured_mesh'
                ]
            },
            {
                id: 'fal-ai/trellis/multi',
                name: 'Trellis Multi',
                description: 'Trellis multi-image to 3D.',
                params: [
                    'image_urls', 'seed', 'ss_guidance_strength', 'ss_sampling_steps', 'slat_guidance_strength', 'slat_sampling_steps', 'mesh_simplify', 'texture_size', 'multiimage_algo'
                ]
            },
            {
                id: 'fal-ai/hunyuan3d/v2',
                name: 'Hunyuan3D v2',
                description: 'Hunyuan3D v2 single image to 3D.',
                params: [
                    'input_image_url', 'seed', 'num_inference_steps', 'guidance_scale', 'octree_resolution', 'textured_mesh'
                ]
            },
            {
                id: 'fal-ai/hunyuan3d/v2/turbo',
                name: 'Hunyuan3D v2 Turbo',
                description: 'Hunyuan3D v2 turbo single image to 3D.',
                params: [
                    'input_image_url', 'seed', 'num_inference_steps', 'guidance_scale', 'octree_resolution', 'textured_mesh'
                ]
            },
            {
                id: 'fal-ai/triposr',
                name: 'TripoSR',
                description: 'TripoSR image to 3D model generation.',
                params: [
                    'image_url', 'output_format', 'do_remove_background', 'foreground_ratio', 'mc_resolution'
                ]
            }
        ];
        super('imageTo3D', supportedModels);
        this.supportedModels = supportedModels;
    }

    mapParams(modelId, params) {
        // Map params per model
        const model = this.supportedModels.find(m => m.id === modelId);
        if (!model) return {};
        const allowed = model.params;
        const mapped = {};
        for (const key of allowed) {
            if (
                params[key] !== undefined &&
                params[key] !== null &&
                !(typeof params[key] === 'string' && params[key].trim() === '') &&
                !(typeof params[key] === 'boolean' && params[key] === false && !['quad', 'auto_size', 'pbr', 'textured_mesh', 'use_hyper', 'TAPose', 'do_remove_background'].includes(key))
            ) {
                mapped[key] = params[key];
            }
        }
        // Special: for Hyper3D, input_image_urls should be array if present
        if (modelId === 'fal-ai/hyper3d/rodin' && mapped.input_image_urls && typeof mapped.input_image_urls === 'string') {
            mapped.input_image_urls = mapped.input_image_urls.split(',').map(s => s.trim()).filter(Boolean);
        }
        // Special: for Trellis multi, image_urls should be array
        if (modelId === 'fal-ai/trellis/multi' && mapped.image_urls && typeof mapped.image_urls === 'string') {
            mapped.image_urls = mapped.image_urls.split(',').map(s => s.trim()).filter(Boolean);
        }
        return mapped;
    }

    async generateContent({ modelId, params }) {
        const mappedParams = this.mapParams(modelId, params);
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
            throw new Error('Failed to submit image-to-3D request to fal.ai: ' + err.message);
        }
        // Poll for completion
        let status, pollCount = 0;
        const maxPolls = 300; // 5 minutes for 3D generation
        const pollIntervalMs = 2000; // Poll every 2 seconds
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
            logger.debug(`[ImageTo3DService] Full fal.ai result for model ${modelId}:`, JSON.stringify(result, null, 2));
        } catch (err) {
            throw new Error('Error fetching fal.ai async result: ' + err.message);
        }
        // Extract all possible URLs based on model type
        const urls = {};
        if (result && result.data) {
            // Tripo3D Image-to-3D: model_mesh, pbr_model, rendered_image
            if (modelId === 'tripo3d/tripo/v2.5/image-to-3d') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
                if (result.data.pbr_model && result.data.pbr_model.url) {
                    urls.pbrModelUrl = result.data.pbr_model.url;
                }
                if (result.data.rendered_image && result.data.rendered_image.url) {
                    urls.renderedImageUrl = result.data.rendered_image.url;
                }
            }
            // Hunyuan3D v21: model_glb, model_glb_pbr, model_mesh
            else if (modelId === 'fal-ai/hunyuan3d-v21') {
                if (result.data.model_glb && result.data.model_glb.url) {
                    urls.modelGlbUrl = result.data.model_glb.url;
                }
                if (result.data.model_glb_pbr && result.data.model_glb_pbr.url) {
                    urls.modelGlbPbrUrl = result.data.model_glb_pbr.url;
                }
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
            }
            // Hyper3D Rodin: model_mesh, textures
            else if (modelId === 'fal-ai/hyper3d/rodin') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
                if (result.data.textures && Array.isArray(result.data.textures)) {
                    urls.textures = result.data.textures.map(texture => texture.url).filter(Boolean);
                }
            }
            // Trellis: model_mesh, timings
            else if (modelId === 'fal-ai/trellis') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
                if (result.data.timings) {
                    urls.timings = result.data.timings;
                }
            }
            // Tripo3D Multiview: model_mesh, pbr_model, rendered_image, base_model
            else if (modelId === 'tripo3d/tripo/v2.5/multiview-to-3d') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
                if (result.data.pbr_model && result.data.pbr_model.url) {
                    urls.pbrModelUrl = result.data.pbr_model.url;
                }
                if (result.data.rendered_image && result.data.rendered_image.url) {
                    urls.renderedImageUrl = result.data.rendered_image.url;
                }
                if (result.data.base_model && result.data.base_model.url) {
                    urls.baseModelUrl = result.data.base_model.url;
                }
            }
            // Hunyuan3D v2 Multi-view: model_mesh
            else if (modelId === 'fal-ai/hunyuan3d/v2/multi-view') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
            }
            // Trellis Multi: model_mesh, timings
            else if (modelId === 'fal-ai/trellis/multi') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
                if (result.data.timings) {
                    urls.timings = result.data.timings;
                }
            }
            // Hunyuan3D v2: model_mesh
            else if (modelId === 'fal-ai/hunyuan3d/v2') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
            }
            // Hunyuan3D v2 Turbo: model_mesh
            else if (modelId === 'fal-ai/hunyuan3d/v2/turbo') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
            }
            // TripoSR: model_mesh, timings, remeshing_dir
            else if (modelId === 'fal-ai/triposr') {
                if (result.data.model_mesh && result.data.model_mesh.url) {
                    urls.modelMeshUrl = result.data.model_mesh.url;
                }
                if (result.data.timings) {
                    urls.timings = result.data.timings;
                }
                if (result.data.remeshing_dir && result.data.remeshing_dir.url) {
                    urls.remeshingDirUrl = result.data.remeshing_dir.url;
                }
            }
        }
        // At least one mesh URL must be present
        if (!urls.modelMeshUrl && !urls.modelGlbUrl && !urls.modelGlbPbrUrl && !urls.pbrModelUrl && !urls.baseModelUrl) {
            logger.error('fal.ai async result missing all mesh URLs', { result });
            throw new Error('fal.ai async result did not return a 3D model URL.');
        }
        return urls;
    }

    getSupportedModels() {
        return this.supportedModels;
    }

    getModelConfig(modelId) {
        return this.supportedModels.find(model => model.id === modelId) || null;
    }

    validateParameters(modelId, params) {
        const modelConfig = this.getModelConfig(modelId);
        if (!modelConfig) {
            return { isValid: false, errors: [`Model ${modelId} not found`] };
        }
        const errors = [];
        // Minimal required field check per model
        if (modelId === 'tripo3d/tripo/v2.5/image-to-3d' && !params.image_url) {
            errors.push('image_url is required');
        }
        if (modelId === 'fal-ai/hunyuan3d-v21' && !params.input_image_url) {
            errors.push('input_image_url is required');
        }
        if (modelId === 'fal-ai/hyper3d/rodin' && !params.input_image_urls) {
            errors.push('input_image_urls is required');
        }
        if (modelId === 'fal-ai/trellis' && !params.image_url) {
            errors.push('image_url is required');
        }
        if (modelId === 'tripo3d/tripo/v2.5/multiview-to-3d' && !params.front_image_url) {
            errors.push('front_image_url is required');
        }
        if (modelId === 'fal-ai/hunyuan3d/v2/multi-view' && !params.front_image_url) {
            errors.push('front_image_url is required');
        }
        if (modelId === 'fal-ai/trellis/multi' && !params.image_urls) {
            errors.push('image_urls is required');
        }
        if (modelId === 'fal-ai/hunyuan3d/v2' && !params.input_image_url) {
            errors.push('input_image_url is required');
        }
        if (modelId === 'fal-ai/hunyuan3d/v2/turbo' && !params.input_image_url) {
            errors.push('input_image_url is required');
        }
        if (modelId === 'fal-ai/triposr' && !params.image_url) {
            errors.push('image_url is required');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = ImageTo3DService; 