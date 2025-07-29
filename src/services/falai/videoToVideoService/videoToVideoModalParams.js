module.exports = {
  'fal-ai/luma-dream-machine/ray-2/modify': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Video Input',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/video.mp4 - URL of the source video to modify',
      required: true,
      help: 'Provide the URL of the video you want to restyle or retexture'
    },
    {
      label: 'Creative Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the visual transformation (e.g., "make it look like a painting", "add cyberpunk effects")',
      required: false,
      help: 'Optional description of how you want to transform the video'
    },
    // === ADVANCED SETTINGS ===
    {
      label: 'Reference Image (Optional)',
      action_id: 'image_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/style-reference.jpg - Optional style reference image',
      required: false,
      help: 'Provide a reference image to guide the video transformation style'
    },
    {
      label: 'Transformation Mode',
      action_id: 'mode',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: 'Flex 1 - Balanced (Recommended)' }, value: 'flex_1' },
        { text: { type: 'plain_text', text: 'Flex 2 - More Creative' }, value: 'flex_2' },
        { text: { type: 'plain_text', text: 'Flex 3 - Most Creative' }, value: 'flex_3' },
        { text: { type: 'plain_text', text: 'Adhere 1 - Conservative' }, value: 'adhere_1' },
        { text: { type: 'plain_text', text: 'Adhere 2 - Moderate Adherence' }, value: 'adhere_2' },
        { text: { type: 'plain_text', text: 'Adhere 3 - Strict Adherence' }, value: 'adhere_3' },
        { text: { type: 'plain_text', text: 'Reimagine 1 - Light Reimagination' }, value: 'reimagine_1' },
        { text: { type: 'plain_text', text: 'Reimagine 2 - Medium Reimagination' }, value: 'reimagine_2' },
        { text: { type: 'plain_text', text: 'Reimagine 3 - Heavy Reimagination' }, value: 'reimagine_3' }
      ],
      default: 'flex_1',
      required: false,
      help: 'Choose how closely the output should follow the original vs. creative interpretation'
    }
  ],

  'fal-ai/wan-vace-14b': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Source Video',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/video.mp4 - URL of the video to inpaint/modify',
      required: true,
      help: 'The source video you want to modify or inpaint'
    },
    {
      label: 'Modification Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe what you want to add, change, or remove in the video',
      required: false,
      help: 'Describe the changes you want to make to the video'
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What to avoid in the output (e.g., "blurry", "artifacts", "low quality")',
      required: false,
      help: 'Describe what you want to avoid in the generated video'
    },

    // === FRAME & TIMING SETTINGS ===
    {
      label: 'Match Input Frame Count',
      action_id: 'match_input_num_frames',
      type: 'checkbox',
      default: true,
      required: false,
      help: 'Keep the same number of frames as the input video'
    },
    {
      label: 'Custom Frame Count',
      action_id: 'num_frames',
      type: 'number_input',
      placeholder: 'Number of frames (if not matching input)',
      required: false,
      help: 'Specify custom frame count (only used if "Match Input Frame Count" is disabled)'
    },
    {
      label: 'Match Input Frame Rate',
      action_id: 'match_input_frames_per_second',
      type: 'checkbox',
      default: true,
      required: false,
      help: 'Keep the same frame rate as the input video'
    },
    {
      label: 'Custom Frame Rate (FPS)',
      action_id: 'frames_per_second',
      type: 'number_input',
      placeholder: 'Frames per second (if not matching input)',
      required: false,
      help: 'Specify custom frame rate (only used if "Match Input Frame Rate" is disabled)'
    },

    // === QUALITY & GENERATION SETTINGS ===
    {
      label: 'Generation Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: '50 (default) - Higher values = better quality but slower',
      required: false,
      help: 'Number of inference steps - higher values improve quality but take longer'
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '7.5 (default) - How closely to follow the prompt',
      required: false,
      help: 'Controls how strictly the AI follows your prompt (1.0-20.0)'
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for reproducible results (optional)',
      required: false,
      help: 'Set a specific seed for reproducible results'
    },

    // === RESOLUTION & ASPECT RATIO ===
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: '480p - Standard' }, value: '480p' },
        { text: { type: 'plain_text', text: '580p - Medium' }, value: '580p' },
        { text: { type: 'plain_text', text: '720p - High Quality' }, value: '720p' }
      ],
      required: false,
      help: 'Choose output resolution (480p, 580p, 720p only)'
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: 'Auto' }, value: 'auto' },
        { text: { type: 'plain_text', text: '16:9 - Widescreen' }, value: '16:9' },
        { text: { type: 'plain_text', text: '1:1 - Square' }, value: '1:1' },
        { text: { type: 'plain_text', text: '9:16 - Vertical' }, value: '9:16' }
      ],
      required: false,
      help: 'Choose aspect ratio (auto, 16:9, 1:1, 9:16 only)'
    },

    // === MASKING & REFERENCE IMAGES ===
    {
      label: 'Mask Video URL',
      action_id: 'mask_video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/mask-video.mp4 - Video mask for selective editing',
      required: false,
      help: 'Optional mask video to specify which areas to modify'
    },
    {
      label: 'Mask Image URL',
      action_id: 'mask_image_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/mask.png - Static mask for selective editing',
      required: false,
      help: 'Optional mask image to specify which areas to modify'
    },
    {
      label: 'Reference Images',
      action_id: 'ref_image_urls',
      type: 'plain_text_input',
      placeholder: 'Comma-separated URLs of reference images for style guidance',
      required: false,
      help: 'Multiple reference images (comma-separated URLs) to guide the generation'
    },

    // === SAFETY & PREPROCESSING ===
    {
      label: 'Safety Checker',
      action_id: 'enable_safety_checker',
      type: 'checkbox',
      default: true,
      required: false,
      help: 'Enable content safety filtering'
    },
    {
      label: 'Prompt Expansion',
      action_id: 'enable_prompt_expansion',
      type: 'checkbox',
      default: false,
      required: false,
      help: 'Automatically expand and enhance your prompt'
    },
    {
      label: 'Preprocessing',
      action_id: 'preprocess',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: 'Auto - Automatic preprocessing' }, value: 'auto' },
        { text: { type: 'plain_text', text: 'None - No preprocessing' }, value: 'none' },
        { text: { type: 'plain_text', text: 'Resize - Resize to fit' }, value: 'resize' },
        { text: { type: 'plain_text', text: 'Crop - Crop to fit' }, value: 'crop' }
      ],
      required: false,
      help: 'How to preprocess the input video'
    },
    {
      label: '⚡ Acceleration',
      action_id: 'acceleration',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: 'Standard - Normal speed' }, value: 'standard' },
        { text: { type: 'plain_text', text: 'Fast - Faster generation' }, value: 'fast' },
        { text: { type: 'plain_text', text: 'Turbo - Fastest generation' }, value: 'turbo' }
      ],
      required: false,
      help: 'Generation speed vs quality tradeoff'
    }
  ],

  'fal-ai/ltx-video-13b-distilled/multiconditioning': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Creative Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the video transformation or generation you want',
      required: true,
      help: 'Main prompt describing what you want to generate or transform'
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What to avoid in the output',
      required: false,
      help: 'Describe what you want to avoid in the generated video'
    },

    // === MEDIA INPUTS ===
    {
      label: 'Input Images',
      action_id: 'images',
      type: 'plain_text_input',
      placeholder: 'Comma-separated image URLs to condition the generation',
      required: false,
      help: 'Multiple images (comma-separated URLs) to guide video generation'
    },
    {
      label: 'Input Videos',
      action_id: 'videos',
      type: 'plain_text_input',
      placeholder: 'Comma-separated video URLs to condition the generation',
      required: true,
      help: 'At least one video URL is required for video-to-video operations.'
    },

    // === GENERATION SETTINGS ===
    {
      label: 'Number of Frames',
      action_id: 'num_frames',
      type: 'number_input',
      placeholder: '120 (default) - Length of generated video',
      required: false,
      help: 'Number of frames in the output video'
    },
    {
      label: 'Frame Rate',
      action_id: 'frame_rate',
      type: 'number_input',
      placeholder: '24 (default) - Frames per second',
      required: false,
      help: 'Frame rate of the output video'
    },
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: '480p - Standard' }, value: '480p' },
        { text: { type: 'plain_text', text: '720p - High Quality' }, value: '720p' }
      ],
      required: false,
      help: 'Output video resolution (480p or 720p only)'
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: '9:16 - Vertical' }, value: '9:16' },
        { text: { type: 'plain_text', text: '1:1 - Square' }, value: '1:1' },
        { text: { type: 'plain_text', text: '16:9 - Widescreen' }, value: '16:9' },
        { text: { type: 'plain_text', text: 'Auto' }, value: 'auto' }
      ],
      required: false,
      help: 'Aspect ratio (9:16, 1:1, 16:9, auto only)'
    },

    // === ADVANCED SETTINGS ===
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for reproducible results',
      required: false,
      help: 'Set seed for reproducible results'
    },
    {
      label: 'Reverse Video',
      action_id: 'reverse_video',
      type: 'checkbox',
      default: false,
      required: false,
      help: 'Generate video in reverse'
    },
    {
      label: 'Expand Prompt',
      action_id: 'expand_prompt',
      type: 'checkbox',
      default: true,
      required: false,
      help: 'Automatically expand and enhance your prompt'
    },
    {
      label: 'Safety Checker',
      action_id: 'enable_safety_checker',
      type: 'checkbox',
      default: true,
      required: false,
      help: 'Enable content safety filtering'
    }
  ],

  'fal-ai/magi/extend-video': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Source Video',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/video.mp4 - Video to extend',
      required: true,
      help: 'The video you want to extend'
    },
    {
      label: 'Extension Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe how the video should continue',
      required: true,
      help: 'Describe what should happen in the video extension'
    },

    // === EXTENSION SETTINGS ===
    {
      label: 'Extension Length (Frames)',
      action_id: 'num_frames',
      type: 'number_input',
      placeholder: '60 (default) - Number of frames to add',
      required: false,
      help: 'How many frames to add to the video'
    },
    {
      label: 'Start Frame',
      action_id: 'start_frame',
      type: 'number_input',
      placeholder: '0 (default) - Frame to start extension from',
      required: false,
      help: 'Which frame to start the extension from'
    },

    // === QUALITY SETTINGS ===
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: '480p - Standard' }, value: '480p' },
        { text: { type: 'plain_text', text: '720p - High Quality' }, value: '720p' }
      ],
      required: false,
      help: 'Output resolution for the extended video (only 480p or 720p allowed)'
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: '16:9 - Widescreen' }, value: '16:9' },
        { text: { type: 'plain_text', text: '9:16 - Vertical/Mobile' }, value: '9:16' },
        { text: { type: 'plain_text', text: '1:1 - Square' }, value: '1:1' },
        { text: { type: 'plain_text', text: '4:3 - Traditional' }, value: '4:3' }
      ],
      required: false,
      help: 'Aspect ratio for the output'
    },
    {
      label: 'Generation Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: '50 (default) - Quality vs speed tradeoff',
      required: false,
      help: 'Higher values = better quality but slower generation'
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for reproducible results',
      required: false,
      help: 'Set seed for reproducible results'
    },
    {
      label: 'Safety Checker',
      action_id: 'enable_safety_checker',
      type: 'checkbox',
      default: true,
      required: false,
      help: 'Enable content safety filtering'
    }
  ],

  'fal-ai/pixverse/lipsync': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Source Video',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/face-video.mp4 - Video with face to lipsync',
      required: true,
      help: 'Video containing the face that will be lip-synced'
    },
    {
      label: 'Audio Source',
      action_id: 'audio_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/speech.mp3 - Audio to sync lips to',
      required: true,
      help: 'Audio file to synchronize the lips with'
    },

    // === VOICE SETTINGS ===
    {
      label: 'Voice ID',
      action_id: 'voice_id',
      type: 'plain_text_input',
      placeholder: 'Optional voice ID for specific voice characteristics',
      required: false,
      help: 'Specific voice ID to use for lip-sync generation'
    },
    {
      label: 'Text Script',
      action_id: 'text',
      type: 'plain_text_input',
      placeholder: 'The text being spoken in the audio (helps with accuracy)',
      required: false,
      help: 'Text transcript of the audio for better lip-sync accuracy'
    }
  ],

  'fal-ai/pixverse/extend/fast': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Source Video',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/video.mp4 - Video to extend',
      required: true,
      help: 'The video you want to extend using fast mode'
    },
    {
      label: 'Extension Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe how the video should continue',
      required: true,
      help: 'What should happen in the video extension'
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What to avoid in the extension',
      required: false,
      help: 'Describe what to avoid in the extended video'
    },

    // === STYLE & QUALITY SETTINGS ===
    {
      label: 'Style',
      action_id: 'style',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: 'Anime - Animated style' }, value: 'anime' },
        { text: { type: 'plain_text', text: '3D Animation - 3D animated style' }, value: '3d_animation' },
        { text: { type: 'plain_text', text: 'Day - Daytime lighting' }, value: 'day' },
        { text: { type: 'plain_text', text: 'Cyberpunk - Futuristic cyberpunk style' }, value: 'cyberpunk' },
        { text: { type: 'plain_text', text: 'Comic - Comic book style' }, value: 'comic' }
      ],
      required: false,
      help: 'Visual style for the video extension'
    },
    {
      label: 'Resolution',
      action_id: 'resolution',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: '360p - Low resolution (fastest)' }, value: '360p' },
        { text: { type: 'plain_text', text: '540p - Medium resolution' }, value: '540p' },
        { text: { type: 'plain_text', text: '720p - High resolution (default)' }, value: '720p' }
      ],
      required: false,
      help: 'Output resolution for the extended video (fast mode doesn\'t support 1080p)'
    },
    {
      label: 'Model Version',
      action_id: 'model',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: 'v3.5 - Stable version' }, value: 'v3.5' },
        { text: { type: 'plain_text', text: 'v4 - Improved version' }, value: 'v4' },
        { text: { type: 'plain_text', text: 'v4.5 - Latest version (default)' }, value: 'v4.5' }
      ],
      required: false,
      help: 'Which model version to use for generation'
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for reproducible results',
      required: false,
      help: 'Set seed for reproducible results'
    }
  ],

  'fal-ai/fast-animatediff/turbo/video-to-video': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Source Video',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/video.mp4 - Video to transform',
      required: true,
      help: 'The source video to transform'
    },
    {
      label: 'Transformation Prompt',
      action_id: 'prompt',
      type: 'plain_text_input',
      placeholder: 'Describe the visual transformation',
      required: true,
      help: 'How you want to transform the video'
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      type: 'plain_text_input',
      placeholder: 'What to avoid in the transformation',
      required: false,
      help: 'What to avoid in the transformed video'
    },

    // === PROCESSING SETTINGS ===
    {
      label: 'Duration (Seconds)',
      action_id: 'first_n_seconds',
      type: 'number_input',
      placeholder: '10 (default) - How many seconds to process',
      required: false,
      help: 'How many seconds from the start of the video to process'
    },
    {
      label: 'Transformation Strength',
      action_id: 'strength',
      type: 'number_input',
      placeholder: '0.8 (default) - How much to transform (0.1-1.0)',
      required: false,
      help: 'How much to transform the original video (0.1 = subtle, 1.0 = complete transformation)'
    },
    {
      label: 'Guidance Scale',
      action_id: 'guidance_scale',
      type: 'number_input',
      placeholder: '7.5 (default) - How closely to follow prompt',
      required: false,
      help: 'How strictly to follow the prompt (1.0-20.0)'
    },
    {
      label: 'Generation Steps',
      action_id: 'num_inference_steps',
      type: 'number_input',
      placeholder: '4 (turbo default) - Quality vs speed',
      required: false,
      help: 'Number of generation steps (turbo mode uses fewer steps)'
    },
    {
      label: 'Frame Rate',
      action_id: 'fps',
      type: 'number_input',
      placeholder: '24 (default) - Output frame rate',
      required: false,
      help: 'Frame rate for the output video'
    },
    {
      label: 'Seed',
      action_id: 'seed',
      type: 'number_input',
      placeholder: 'Random seed for reproducible results',
      required: false,
      help: 'Set seed for reproducible results'
    },

    // === MOTION SETTINGS ===
    {
      label: 'Motion Patterns',
      action_id: 'motions',
      type: 'plain_text_input',
      placeholder: 'Comma-separated motion descriptors (e.g., "zoom in", "pan left", "rotate")',
      required: false,
      help: 'Specific motion patterns to apply during transformation'
    }
  ],

  'fal-ai/video-upscaler': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Source Video',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/video.mp4 - Video to upscale',
      required: true,
      help: 'The video you want to upscale to higher resolution'
    },
    {
      label: 'Upscale Factor',
      action_id: 'scale',
      type: 'static_select',
      options: [
        { text: { type: 'plain_text', text: '2x - Double resolution' }, value: '2' },
        { text: { type: 'plain_text', text: '3x - Triple resolution' }, value: '3' },
        { text: { type: 'plain_text', text: '4x - Quadruple resolution' }, value: '4' }
      ],
      default: '2',
      required: true,
      help: 'How much to increase the video resolution'
    }
  ],

  'fal-ai/amt-interpolation': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Source Video',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/video.mp4 - Video to interpolate',
      required: true,
      help: 'The video you want to increase the frame rate of'
    },
    {
      label: 'Target Frame Rate',
      action_id: 'output_fps',
      type: 'number_input',
      placeholder: '60 (default) - Target frames per second',
      required: true,
      help: 'The desired frame rate for the output video'
    },
    {
      label: 'Interpolation Passes',
      action_id: 'recursive_interpolation_passes',
      type: 'number_input',
      placeholder: '1 (default) - Number of interpolation passes',
      required: false,
      help: 'Number of recursive interpolation passes (more passes = smoother but slower)'
    }
  ],

  'fal-ai/ffmpeg-api/merge-audio-video': [
    // === BASIC CONFIGURATION ===
    {
      label: 'Video Source',
      action_id: 'video_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/video.mp4 - Video file to merge',
      required: true,
      help: 'The video file for merging with audio'
    },
    {
      label: 'Audio Source',
      action_id: 'audio_url',
      type: 'plain_text_input',
      placeholder: 'https://example.com/audio.mp3 - Audio file to merge',
      required: true,
      help: 'The audio file to combine with the video'
    },
    {
      label: 'Start Offset (Seconds)',
      action_id: 'start_offset',
      type: 'number_input',
      placeholder: '0 (default) - When to start the audio in the video',
      required: false,
      help: 'How many seconds into the video to start the audio'
    }
  ]
};   