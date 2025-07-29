module.exports = {
  'fal-ai/kling-video/v2/master/text-to-video': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['5', '10'],
      default: '5',
      required: false
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['16:9', '9:16', '1:1'],
      default: '16:9',
      required: false
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      placeholder: 'What to avoid in the video',
      type: 'plain_text_input',
      default: 'blur, distort, and low quality',
      required: false
    },
    {
      label: 'Cfg Scale',
      action_id: 'cfg_scale',
      type: 'number_input',
      default: 0.5,
      required: false
    }
  ],
  'fal-ai/bytedance/seedance/v1/pro/text-to-video': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
      default: '16:9',
      required: false
    },
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: ['480p', '1080p'],
      default: '1080p',
      required: false
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['5', '10'],
      default: '5',
      required: false
    },
    {
      label: 'Camera Fixed',
      action_id: 'camera_fixed',
      type: 'checkbox',
      default: false,
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      required: false
    }
  ],
  'fal-ai/pixverse/v4/text-to-video/fast': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['16:9', '4:3', '1:1', '3:4', '9:16'],
      default: '16:9',
      required: false
    },
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: ['360p', '540p', '720p'],
      default: '720p',
      required: false
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What should the video avoid?',
      required: false
    },
    {
      label: 'Style',
      action_id: 'style',
      type: 'static_select',
      options: ['anime', '3d_animation', 'clay', 'comic', 'cyberpunk'],
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed (optional)',
      required: false
    }
  ],
  'fal-ai/pixverse/v4.5/text-to-video': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['16:9', '4:3', '1:1', '3:4', '9:16'],
      default: '16:9',
      required: false
    },
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: ['360p', '540p', '720p', '1080p'],
      default: '720p',
      required: false
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['5', '8'],
      default: '5',
      required: false
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What should the video avoid?',
      required: false
    },
    {
      label: 'Style',
      action_id: 'style',
      type: 'static_select',
      options: ['anime', '3d_animation', 'clay', 'comic', 'cyberpunk'],
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed (optional)',
      required: false
    }
  ],
  'fal-ai/wan-pro/text-to-video': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed (optional)',
      required: false
    },
    {
      label: 'Enable Safety Checker',
      action_id: 'enable_safety_checker',
      type: 'checkbox',
      default: true,
      required: false
    }
  ],
  'fal-ai/luma-dream-machine/ray-2-flash': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['16:9', '9:16', '4:3', '3:4', '21:9', '9:21'],
      default: '16:9',
      required: false
    },
    {
      label: 'Loop',
      action_id: 'loop',
      type: 'checkbox',
      required: false
    },
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: ['540p', '720p', '1080p'],
      default: '540p',
      required: false
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['5s', '9s'],
      default: '5s',
      required: false
    }
  ],
  'fal-ai/pika/v2.2/text-to-video': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed (optional)',
      required: false
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What should the video avoid?',
      required: false
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['16:9', '9:16', '1:1', '4:5', '5:4', '3:2', '2:3'],
      default: '16:9',
      required: false
    },
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: ['720p', '1080p'],
      default: '720p',
      required: false
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['5'],
      default: '5',
      required: false
    }
  ],
  'fal-ai/minimax/hailuo-02/standard/text-to-video': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['6', '10'],
      default: '6',
      required: false
    },
    {
      label: 'Prompt Optimizer',
      action_id: 'prompt_optimizer',
      type: 'checkbox',
      default: true,
      required: false
    }
  ],
  'fal-ai/veo3': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['16:9', '9:16', '1:1'],
      default: '16:9',
      required: false
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['8s'],
      default: '8s',
      required: false
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What should the video avoid?',
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed (optional)',
      required: false
    },
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: ['720p', '1080p'],
      default: '720p',
      required: false
    },
    {
      label: 'Generate Audio',
      action_id: 'generate_audio',
      type: 'checkbox',
      default: true,
      required: false
    }
  ],
  'fal-ai/veo2': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe your video...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['16:9', '9:16'],
      default: '16:9',
      required: false
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['5s', '6s', '7s', '8s'],
      default: '5s',
      required: false
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What should the video avoid?',
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'plain_text_input',
      placeholder: 'Random seed (optional)',
      required: false
    }
  ]
}; 