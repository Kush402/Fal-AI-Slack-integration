module.exports = {
  'fal-ai/image-editing/background-change': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to edit...',
      required: true
    },
    {
      label: 'Background Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the new background (e.g., beach sunset with palm trees)',
      required: false
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '3.5 (default) - Controls how closely to follow the prompt',
      required: false
    },
    {
      label: 'Number of Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: '30 (default) - Number of inference steps',
      required: false
    },
    {
      label: 'Safety Tolerance',
      action_id: 'safety_tolerance',
      type: 'static_select',
      options: [
        { text: '1 - Most Strict', value: '1' },
        { text: '2 - Strict', value: '2' },
        { text: '3 - Moderate', value: '3' },
        { text: '4 - Permissive', value: '4' },
        { text: '5 - Very Permissive', value: '5' },
        { text: '6 - Most Permissive', value: '6' }
      ],
      default: '2',
      required: false
    },
    {
      label: 'Output Format',
      action_id: 'output_format',
      type: 'static_select',
      options: [
        { text: 'JPEG', value: 'jpeg' },
        { text: 'PNG', value: 'png' }
      ],
      default: 'jpeg',
      required: false
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: '21:9 - Ultra Wide', value: '21:9' },
        { text: '16:9 - Wide', value: '16:9' },
        { text: '4:3 - Standard', value: '4:3' },
        { text: '3:2 - Classic', value: '3:2' },
        { text: '1:1 - Square', value: '1:1' },
        { text: '2:3 - Portrait', value: '2:3' },
        { text: '3:4 - Portrait', value: '3:4' },
        { text: '9:16 - Mobile', value: '9:16' },
        { text: '9:21 - Ultra Portrait', value: '9:21' }
      ],
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed for reproducible results (optional)',
      required: false
    },
    {
      label: 'Sync Mode',
      action_id: 'sync_mode',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/image-editing/face-enhancement': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to enhance...',
      required: true
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '3.5 (default) - Controls enhancement intensity',
      required: false
    },
    {
      label: 'Number of Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: '30 (default) - Number of inference steps',
      required: false
    },
    {
      label: 'Safety Tolerance',
      action_id: 'safety_tolerance',
      type: 'static_select',
      options: [
        { text: '1 - Most Strict', value: '1' },
        { text: '2 - Strict', value: '2' },
        { text: '3 - Moderate', value: '3' },
        { text: '4 - Permissive', value: '4' },
        { text: '5 - Very Permissive', value: '5' },
        { text: '6 - Most Permissive', value: '6' }
      ],
      default: '2',
      required: false
    },
    {
      label: 'Output Format',
      action_id: 'output_format',
      type: 'static_select',
      options: [
        { text: 'JPEG', value: 'jpeg' },
        { text: 'PNG', value: 'png' }
      ],
      default: 'jpeg',
      required: false
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: '21:9 - Ultra Wide', value: '21:9' },
        { text: '16:9 - Wide', value: '16:9' },
        { text: '4:3 - Standard', value: '4:3' },
        { text: '3:2 - Classic', value: '3:2' },
        { text: '1:1 - Square', value: '1:1' },
        { text: '2:3 - Portrait', value: '2:3' },
        { text: '3:4 - Portrait', value: '3:4' },
        { text: '9:16 - Mobile', value: '9:16' },
        { text: '9:21 - Ultra Portrait', value: '9:21' }
      ],
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed for reproducible results (optional)',
      required: false
    },
    {
      label: 'Sync Mode',
      action_id: 'sync_mode',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/image-editing/color-correction': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to correct...',
      required: true
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '3.5 (default) - Controls correction intensity',
      required: false
    },
    {
      label: 'Number of Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: '30 (default) - Number of inference steps',
      required: false
    },
    {
      label: 'Safety Tolerance',
      action_id: 'safety_tolerance',
      type: 'static_select',
      options: [
        { text: '1 - Most Strict', value: '1' },
        { text: '2 - Strict', value: '2' },
        { text: '3 - Moderate', value: '3' },
        { text: '4 - Permissive', value: '4' },
        { text: '5 - Very Permissive', value: '5' },
        { text: '6 - Most Permissive', value: '6' }
      ],
      default: '2',
      required: false
    },
    {
      label: 'Output Format',
      action_id: 'output_format',
      type: 'static_select',
      options: [
        { text: 'JPEG', value: 'jpeg' },
        { text: 'PNG', value: 'png' }
      ],
      default: 'jpeg',
      required: false
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: '21:9 - Ultra Wide', value: '21:9' },
        { text: '16:9 - Wide', value: '16:9' },
        { text: '4:3 - Standard', value: '4:3' },
        { text: '3:2 - Classic', value: '3:2' },
        { text: '1:1 - Square', value: '1:1' },
        { text: '2:3 - Portrait', value: '2:3' },
        { text: '3:4 - Portrait', value: '3:4' },
        { text: '9:16 - Mobile', value: '9:16' },
        { text: '9:21 - Ultra Portrait', value: '9:21' }
      ],
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed for reproducible results (optional)',
      required: false
    },
    {
      label: 'Sync Mode',
      action_id: 'sync_mode',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/post-processing/sharpen': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to sharpen...',
      required: true
    },
    {
      label: 'Sharpening Mode',
      action_id: 'sharpen_mode',
      type: 'static_select',
      options: [
        { text: 'Basic Unsharp Mask', value: 'basic' },
        { text: 'Smart Sharpening', value: 'smart' },
        { text: 'Contrast Adaptive Sharpening', value: 'cas' }
      ],
      default: 'basic',
      required: false
    },
    {
      label: 'Sharpen Radius',
      action_id: 'sharpen_radius',
      type: 'number_input',
      placeholder: '1 (default) - Sharpening radius',
      required: false
    },
    {
      label: 'Sharpen Alpha',
      action_id: 'sharpen_alpha',
      type: 'number_input',
      placeholder: '1 (default) - Sharpening intensity',
      required: false
    },
    {
      label: 'Noise Radius',
      action_id: 'noise_radius',
      type: 'number_input',
      placeholder: '7 (default) - Noise radius for smart sharpen',
      required: false
    },
    {
      label: 'Preserve Edges',
      action_id: 'preserve_edges',
      type: 'number_input',
      placeholder: '0.75 (default) - Edge preservation factor',
      required: false
    },
    {
      label: 'Smart Sharpen Strength',
      action_id: 'smart_sharpen_strength',
      type: 'number_input',
      placeholder: '5 (default) - Smart sharpen strength',
      required: false
    },
    {
      label: 'Smart Sharpen Ratio',
      action_id: 'smart_sharpen_ratio',
      type: 'number_input',
      placeholder: '0.5 (default) - Smart sharpen blend ratio',
      required: false
    },
    {
      label: 'CAS Amount',
      action_id: 'cas_amount',
      type: 'number_input',
      placeholder: '0.8 (default) - CAS sharpening amount',
      required: false
    }
  ],
  'fal-ai/image-editing/object-removal': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to edit...',
      required: true
    },
    {
      label: 'Removal Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe what to remove (e.g., background people)',
      required: false
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '3.5 (default) - Controls removal precision',
      required: false
    },
    {
      label: 'Number of Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: '30 (default) - Number of inference steps',
      required: false
    },
    {
      label: 'Safety Tolerance',
      action_id: 'safety_tolerance',
      type: 'static_select',
      options: [
        { text: '1 - Most Strict', value: '1' },
        { text: '2 - Strict', value: '2' },
        { text: '3 - Moderate', value: '3' },
        { text: '4 - Permissive', value: '4' },
        { text: '5 - Very Permissive', value: '5' },
        { text: '6 - Most Permissive', value: '6' }
      ],
      default: '2',
      required: false
    },
    {
      label: 'Output Format',
      action_id: 'output_format',
      type: 'static_select',
      options: [
        { text: 'JPEG', value: 'jpeg' },
        { text: 'PNG', value: 'png' }
      ],
      default: 'jpeg',
      required: false
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: '21:9 - Ultra Wide', value: '21:9' },
        { text: '16:9 - Wide', value: '16:9' },
        { text: '4:3 - Standard', value: '4:3' },
        { text: '3:2 - Classic', value: '3:2' },
        { text: '1:1 - Square', value: '1:1' },
        { text: '2:3 - Portrait', value: '2:3' },
        { text: '3:4 - Portrait', value: '3:4' },
        { text: '9:16 - Mobile', value: '9:16' },
        { text: '9:21 - Ultra Portrait', value: '9:21' }
      ],
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed for reproducible results (optional)',
      required: false
    },
    {
      label: 'Sync Mode',
      action_id: 'sync_mode',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/flux/dev/image-to-image': [
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to transform...',
      required: true
    },
    {
      label: 'Transformation Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the transformation you want to apply...',
      required: true
    },
    {
      label: 'Strength',
      action_id: 'strength',
      type: 'number_input',
      placeholder: '0.95 (default) - Strength of initial image influence',
      required: false
    },
    {
      label: 'Number of Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: '40 (default) - Number of inference steps',
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed for reproducible results (optional)',
      required: false
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '3.5 (default) - Controls transformation intensity',
      required: false
    },
    {
      label: 'Sync Mode',
      action_id: 'sync_mode',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Number of Images',
      action_id: 'num_images',
      type: 'number_input',
      placeholder: '1 (default) - Number of images to generate',
      required: false
    },
    {
      label: 'Enable Safety Checker',
      action_id: 'enable_safety_checker',
      type: 'checkbox',
      default: true,
      required: false
    },
    {
      label: 'Output Format',
      action_id: 'output_format',
      type: 'static_select',
      options: [
        { text: 'JPEG', value: 'jpeg' },
        { text: 'PNG', value: 'png' }
      ],
      default: 'jpeg',
      required: false
    },
    {
      label: 'Acceleration',
      action_id: 'acceleration',
      type: 'static_select',
      options: [
        { text: 'None', value: 'none' },
        { text: 'Regular', value: 'regular' },
        { text: 'High', value: 'high' }
      ],
      default: 'none',
      required: false
    }
  ],
  'fal-ai/recraft/v3/image-to-image': [
    {
      label: 'Editing Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the editing changes with typography and vector art...',
      required: true
    },
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to edit...',
      required: true
    },
    {
      label: 'Strength',
      action_id: 'strength',
      type: 'number_input',
      placeholder: '0.5 (default) - Controls editing intensity',
      required: false
    },
    {
      label: 'Style',
      action_id: 'style',
      type: 'static_select',
      options: [
        { text: 'Realistic Image', value: 'realistic_image' },
        { text: 'Digital Illustration', value: 'digital_illustration' },
        { text: 'Vector Illustration', value: 'vector_illustration' }
      ],
      default: 'realistic_image',
      required: false
    },
    {
      label: 'Style ID',
      action_id: 'style_id',
      type: 'plain_text_input',
      placeholder: 'Custom style reference ID (optional)',
      required: false
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'Describe undesired elements (optional)',
      required: false
    },
    {
      label: 'Sync Mode',
      action_id: 'sync_mode',
      type: 'checkbox',
      default: false,
      required: false
    }
  ],
  'fal-ai/luma-photon/modify': [
    {
      label: 'Modification Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the creative modifications you want...',
      required: true
    },
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to modify...',
      required: true
    },
    {
      label: 'Strength',
      action_id: 'strength',
      type: 'number_input',
      placeholder: '0.8 (default) - Controls modification intensity',
      required: false
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: '1:1 - Square', value: '1:1' },
        { text: '16:9 - Wide', value: '16:9' },
        { text: '9:16 - Portrait', value: '9:16' },
        { text: '4:3 - Standard', value: '4:3' },
        { text: '3:4 - Portrait', value: '3:4' },
        { text: '21:9 - Ultra Wide', value: '21:9' },
        { text: '9:21 - Ultra Portrait', value: '9:21' }
      ],
      default: '16:9',
      required: false
    }
  ],
  'fal-ai/bytedance/seededit/v3/edit-image': [
    {
      label: 'Editing Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the precise editing changes...',
      required: true
    },
    {
      label: 'Image URL',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'Enter the URL of the image to edit...',
      required: true
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '0.5 (default) - Controls editing precision',
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed for reproducible results (optional)',
      required: false
    }
  ],
  'fal-ai/flux-pro/kontext/max/multi': [
    {
      label: 'Premium Editing Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the premium editing changes with typography...',
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed for reproducible results (optional)',
      required: false
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '3.5 (default) - Controls editing precision',
      required: false
    },
    {
      label: 'Sync Mode',
      action_id: 'sync_mode',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Number of Images',
      action_id: 'num_images',
      type: 'number_input',
      placeholder: '1 (default) - Number of images to generate',
      required: false
    },
    {
      label: 'Output Format',
      action_id: 'output_format',
      type: 'static_select',
      options: [
        { text: 'JPEG', value: 'jpeg' },
        { text: 'PNG', value: 'png' }
      ],
      default: 'jpeg',
      required: false
    },
    {
      label: 'Safety Tolerance',
      action_id: 'safety_tolerance',
      type: 'static_select',
      options: [
        { text: '1 - Most Strict', value: '1' },
        { text: '2 - Strict', value: '2' },
        { text: '3 - Moderate', value: '3' },
        { text: '4 - Permissive', value: '4' },
        { text: '5 - Very Permissive', value: '5' },
        { text: '6 - Most Permissive', value: '6' }
      ],
      default: '2',
      required: false
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: '21:9 - Ultra Wide', value: '21:9' },
        { text: '16:9 - Wide', value: '16:9' },
        { text: '4:3 - Standard', value: '4:3' },
        { text: '3:2 - Classic', value: '3:2' },
        { text: '1:1 - Square', value: '1:1' },
        { text: '2:3 - Portrait', value: '2:3' },
        { text: '3:4 - Portrait', value: '3:4' },
        { text: '9:16 - Mobile', value: '9:16' },
        { text: '9:21 - Ultra Portrait', value: '9:21' }
      ],
      required: false
    },
    {
      label: 'Image URLs',
      action_id: 'image_urls',
      type: 'plain_text_input',
      placeholder: 'Enter image URLs separated by commas...',
      required: true
    }
  ]
}; 