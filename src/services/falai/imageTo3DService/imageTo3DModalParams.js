module.exports = {
  'tripo3d/tripo/v2.5/image-to-3d': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to use for 3D generation...',
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for geometry (optional)',
      required: false
    },
    {
      label: 'Face Limit',
      action_id: 'face_limit',
      type: 'number_input',
      placeholder: 'Limit number of faces (optional)',
      required: false
    },
    {
      label: 'PBR',
      action_id: 'pbr',
      type: 'checkbox',
      default: true,
      required: false
    },
    {
      label: 'Texture',
      action_id: 'texture',
      type: 'static_select',
      options: [
        { text: 'No Texture', value: 'no' },
        { text: 'Standard', value: 'standard' },
        { text: 'HD', value: 'HD' }
      ],
      default: 'standard',
      required: false
    },
    {
      label: 'Texture Seed',
      action_id: 'texture_seed',
      type: 'number_input',
      placeholder: 'Random seed for texture (optional)',
      required: false
    },
    {
      label: 'Auto Size',
      action_id: 'auto_size',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Style',
      action_id: 'style',
      type: 'static_select',
      options: [
        { text: 'None', value: 'none' },
        { text: 'Person to Cartoon', value: 'person:person2cartoon' },
        { text: 'Clay', value: 'object:clay' },
        { text: 'Steampunk', value: 'object:steampunk' },
        { text: 'Venom', value: 'animal:venom' },
        { text: 'Barbie', value: 'object:barbie' },
        { text: 'Christmas', value: 'object:christmas' },
        { text: 'Gold', value: 'gold' },
        { text: 'Ancient Bronze', value: 'ancient_bronze' }
      ],
      required: false
    },
    {
      label: 'Quad Mesh Output',
      action_id: 'quad',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Texture Alignment',
      action_id: 'texture_alignment',
      type: 'static_select',
      options: [
        { text: 'Original Image', value: 'original_image' },
        { text: 'Geometry', value: 'geometry' }
      ],
      default: 'original_image',
      required: false
    },
    {
      label: 'Orientation',
      action_id: 'orientation',
      type: 'static_select',
      options: [
        { text: 'Default', value: 'default' },
        { text: 'Align Image', value: 'align_image' }
      ],
      default: 'default',
      required: false
    }
  ],
  'fal-ai/hunyuan3d-v21': [
    {
      label: 'Input Image URL',
      action_id: 'input_image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to use for 3D generation...',
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for generation (optional)',
      required: false
    },
    {
      label: 'Number of Inference Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: 'Number of inference steps (default: 50)',
      default: 50,
      required: false
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: 'Guidance scale for the model (default: 7.5)',
      default: 7.5,
      required: false
    },
    {
      label: 'Octree Resolution',
      action_id: 'octree_resolution',
      type: 'number_input',
      placeholder: 'Octree resolution for the model (default: 256)',
      default: 256,
      required: false
    },
    {
      label: 'Textured Mesh',
      action_id: 'textured_mesh',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/hyper3d/rodin': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'A textual prompt to guide model generation (optional for Image-to-3D mode)',
      required: false
    },
    {
      label: 'Input Image URLs',
      action_id: 'input_image_urls',
      type: 'plain_text_input',
      placeholder: 'Enter image URLs separated by commas or new lines...',
      multiline: true,
      required: true
    },
    {
      label: 'Condition Mode',
      action_id: 'condition_mode',
      type: 'static_select',
      options: [
        { text: 'Concat', value: 'concat' },
        { text: 'Fuse', value: 'fuse' }
      ],
      default: 'concat',
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Seed value for randomization (0-65535)',
      required: false
    },
    {
      label: 'Geometry File Format',
      action_id: 'geometry_file_format',
      type: 'static_select',
      options: [
        { text: 'GLB', value: 'glb' },
        { text: 'USDZ', value: 'usdz' },
        { text: 'FBX', value: 'fbx' },
        { text: 'OBJ', value: 'obj' },
        { text: 'STL', value: 'stl' }
      ],
      default: 'glb',
      required: false
    },
    {
      label: 'Material',
      action_id: 'material',
      type: 'static_select',
      options: [
        { text: 'PBR', value: 'PBR' },
        { text: 'Shaded', value: 'Shaded' }
      ],
      default: 'PBR',
      required: false
    },
    {
      label: 'Quality',
      action_id: 'quality',
      type: 'static_select',
      options: [
        { text: 'High', value: 'high' },
        { text: 'Medium', value: 'medium' },
        { text: 'Low', value: 'low' },
        { text: 'Extra Low', value: 'extra-low' }
      ],
      default: 'medium',
      required: false
    },
    {
      label: 'Use Hyper',
      action_id: 'use_hyper',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Tier',
      action_id: 'tier',
      type: 'static_select',
      options: [
        { text: 'Regular', value: 'Regular' },
        { text: 'Sketch', value: 'Sketch' }
      ],
      default: 'Regular',
      required: false
    },
    {
      label: 'T/A Pose',
      action_id: 'TAPose',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Addons',
      action_id: 'addons',
      type: 'static_select',
      options: [
        { text: 'None', value: 'none' },
        { text: 'HighPack', value: 'HighPack' }
      ],
      default: 'none',
      required: false
    }
  ],
  'fal-ai/trellis': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'URL of the input image to convert to 3D',
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for reproducibility',
      required: false
    },
    {
      label: 'SS Guidance Strength',
      action_id: 'ss_guidance_strength',
      type: 'number_input',
      placeholder: 'Guidance strength for sparse structure generation (default: 7.5)',
      default: 7.5,
      required: false
    },
    {
      label: 'SS Sampling Steps',
      action_id: 'ss_sampling_steps',
      type: 'number_input',
      placeholder: 'Sampling steps for sparse structure generation (default: 12)',
      default: 12,
      required: false
    },
    {
      label: 'SLAT Guidance Strength',
      action_id: 'slat_guidance_strength',
      type: 'number_input',
      placeholder: 'Guidance strength for structured latent generation (default: 3)',
      default: 3,
      required: false
    },
    {
      label: 'SLAT Sampling Steps',
      action_id: 'slat_sampling_steps',
      type: 'number_input',
      placeholder: 'Sampling steps for structured latent generation (default: 12)',
      default: 12,
      required: false
    },
    {
      label: 'Mesh Simplify',
      action_id: 'mesh_simplify',
      type: 'number_input',
      placeholder: 'Mesh simplification factor (default: 0.95)',
      default: 0.95,
      required: false
    },
    {
      label: 'Texture Size',
      action_id: 'texture_size',
      type: 'static_select',
      options: [
        { text: '512', value: 512 },
        { text: '1024', value: 1024 },
        { text: '2048', value: 2048 }
      ],
      default: 1024,
      required: false
    }
  ],
  'tripo3d/tripo/v2.5/multiview-to-3d': [
    {
      label: 'Front Image URL',
      action_id: 'front_image_url',
      type: 'plain_text_input',
      placeholder: 'Front view image of the object (required)',
      required: true
    },
    {
      label: 'Left Image URL',
      action_id: 'left_image_url',
      type: 'plain_text_input',
      placeholder: 'Left view image of the object (optional)',
      required: false
    },
    {
      label: 'Back Image URL',
      action_id: 'back_image_url',
      type: 'plain_text_input',
      placeholder: 'Back view image of the object (optional)',
      required: false
    },
    {
      label: 'Right Image URL',
      action_id: 'right_image_url',
      type: 'plain_text_input',
      placeholder: 'Right view image of the object (optional)',
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for model generation (optional)',
      required: false
    },
    {
      label: 'Face Limit',
      action_id: 'face_limit',
      type: 'number_input',
      placeholder: 'Limits the number of faces on the output model (optional)',
      required: false
    },
    {
      label: 'PBR',
      action_id: 'pbr',
      type: 'checkbox',
      default: true,
      required: false
    },
    {
      label: 'Texture',
      action_id: 'texture',
      type: 'static_select',
      options: [
        { text: 'No Texture', value: 'no' },
        { text: 'Standard', value: 'standard' },
        { text: 'HD', value: 'HD' }
      ],
      default: 'standard',
      required: false
    },
    {
      label: 'Texture Seed',
      action_id: 'texture_seed',
      type: 'number_input',
      placeholder: 'Random seed for texture generation (optional)',
      required: false
    },
    {
      label: 'Auto Size',
      action_id: 'auto_size',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Style',
      action_id: 'style',
      type: 'static_select',
      options: [
        { text: 'None', value: 'none' },
        { text: 'Person to Cartoon', value: 'person:person2cartoon' },
        { text: 'Clay', value: 'object:clay' },
        { text: 'Steampunk', value: 'object:steampunk' },
        { text: 'Venom', value: 'animal:venom' },
        { text: 'Barbie', value: 'object:barbie' },
        { text: 'Christmas', value: 'object:christmas' },
        { text: 'Gold', value: 'gold' },
        { text: 'Ancient Bronze', value: 'ancient_bronze' }
      ],
      required: false
    },
    {
      label: 'Quad',
      action_id: 'quad',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Texture Alignment',
      action_id: 'texture_alignment',
      type: 'static_select',
      options: [
        { text: 'Original Image', value: 'original_image' },
        { text: 'Geometry', value: 'geometry' }
      ],
      default: 'original_image',
      required: false
    },
    {
      label: 'Orientation',
      action_id: 'orientation',
      type: 'static_select',
      options: [
        { text: 'Default', value: 'default' },
        { text: 'Align Image', value: 'align_image' }
      ],
      default: 'default',
      required: false
    }
  ],
  'fal-ai/hunyuan3d/v2/multi-view': [
    {
      label: 'Front Image URL',
      action_id: 'front_image_url',
      type: 'plain_text_input',
      placeholder: 'Front view image of the object (required)',
      required: true
    },
    {
      label: 'Back Image URL',
      action_id: 'back_image_url',
      type: 'plain_text_input',
      placeholder: 'Back view image of the object (optional)',
      required: false
    },
    {
      label: 'Left Image URL',
      action_id: 'left_image_url',
      type: 'plain_text_input',
      placeholder: 'Left view image of the object (optional)',
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for generation (optional)',
      required: false
    },
    {
      label: 'Number of Inference Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: 'Number of inference steps (default: 50)',
      default: 50,
      required: false
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: 'Guidance scale for the model (default: 7.5)',
      default: 7.5,
      required: false
    },
    {
      label: 'Octree Resolution',
      action_id: 'octree_resolution',
      type: 'number_input',
      placeholder: 'Octree resolution for the model (default: 256)',
      default: 256,
      required: false
    },
    {
      label: 'Textured Mesh',
      action_id: 'textured_mesh',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/trellis/multi': [
    {
      label: 'Image URLs',
      action_id: 'image_urls',
      type: 'plain_text_input',
      placeholder: 'Enter image URLs separated by commas or new lines...',
      multiline: true,
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for reproducibility',
      required: false
    },
    {
      label: 'SS Guidance Strength',
      action_id: 'ss_guidance_strength',
      type: 'number_input',
      placeholder: 'Guidance strength for sparse structure generation (default: 7.5)',
      default: 7.5,
      required: false
    },
    {
      label: 'SS Sampling Steps',
      action_id: 'ss_sampling_steps',
      type: 'number_input',
      placeholder: 'Sampling steps for sparse structure generation (default: 12)',
      default: 12,
      required: false
    },
    {
      label: 'SLAT Guidance Strength',
      action_id: 'slat_guidance_strength',
      type: 'number_input',
      placeholder: 'Guidance strength for structured latent generation (default: 3)',
      default: 3,
      required: false
    },
    {
      label: 'SLAT Sampling Steps',
      action_id: 'slat_sampling_steps',
      type: 'number_input',
      placeholder: 'Sampling steps for structured latent generation (default: 12)',
      default: 12,
      required: false
    },
    {
      label: 'Mesh Simplify',
      action_id: 'mesh_simplify',
      type: 'number_input',
      placeholder: 'Mesh simplification factor (default: 0.95)',
      default: 0.95,
      required: false
    },
    {
      label: 'Texture Size',
      action_id: 'texture_size',
      type: 'static_select',
      options: [
        { text: '512', value: 512 },
        { text: '1024', value: 1024 },
        { text: '2048', value: 2048 }
      ],
      default: 1024,
      required: false
    },
    {
      label: 'Multi-image Algorithm',
      action_id: 'multiimage_algo',
      type: 'static_select',
      options: [
        { text: 'Stochastic', value: 'stochastic' },
        { text: 'Multi-diffusion', value: 'multidiffusion' }
      ],
      default: 'stochastic',
      required: false
    }
  ],
  'fal-ai/hunyuan3d/v2': [
    {
      label: 'Input Image URL',
      action_id: 'input_image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to use for 3D generation...',
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for generation (optional)',
      required: false
    },
    {
      label: 'Number of Inference Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: 'Number of inference steps (default: 50)',
      default: 50,
      required: false
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: 'Guidance scale for the model (default: 7.5)',
      default: 7.5,
      required: false
    },
    {
      label: 'Octree Resolution',
      action_id: 'octree_resolution',
      type: 'number_input',
      placeholder: 'Octree resolution for the model (default: 256)',
      default: 256,
      required: false
    },
    {
      label: 'Textured Mesh',
      action_id: 'textured_mesh',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/hunyuan3d/v2/turbo': [
    {
      label: 'Input Image URL',
      action_id: 'input_image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to use for 3D generation...',
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for generation (optional)',
      required: false
    },
    {
      label: 'Number of Inference Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: 'Number of inference steps (default: 50)',
      default: 50,
      required: false
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: 'Guidance scale for the model (default: 7.5)',
      default: 7.5,
      required: false
    },
    {
      label: 'Octree Resolution',
      action_id: 'octree_resolution',
      type: 'number_input',
      placeholder: 'Octree resolution for the model (default: 256)',
      default: 256,
      required: false
    },
    {
      label: 'Textured Mesh',
      action_id: 'textured_mesh',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/triposr': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Path for the image file to be processed',
      required: true
    },
    {
      label: 'Output Format',
      action_id: 'output_format',
      type: 'static_select',
      options: [
        { text: 'GLB', value: 'glb' },
        { text: 'OBJ', value: 'obj' }
      ],
      default: 'glb',
      required: false
    },
    {
      label: 'Remove Background',
      action_id: 'do_remove_background',
      type: 'checkbox',
      default: true,
      required: false
    },
    {
      label: 'Foreground Ratio',
      action_id: 'foreground_ratio',
      type: 'number_input',
      placeholder: 'Ratio of the foreground image to the original image (default: 0.9)',
      default: 0.9,
      required: false
    },
    {
      label: 'MC Resolution',
      action_id: 'mc_resolution',
      type: 'number_input',
      placeholder: 'Resolution of the marching cubes (default: 256)',
      default: 256,
      required: false
    }
  ]
}; 