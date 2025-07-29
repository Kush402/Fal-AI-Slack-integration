module.exports = {
  'fal-ai/lyria2': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe the music you want to generate...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Negative Prompt',
      action_id: 'negative_prompt',
      placeholder: 'What should be excluded? (e.g., vocals, low quality)',
      type: 'plain_text_input',
      required: false
    },
    {
      label: 'Seed',
      action_id: 'seed',
      placeholder: 'Optional seed for reproducibility',
      type: 'number_input',
      required: false
    }
  ],
  'fal-ai/ace-step': [
    { label: 'Tags', action_id: 'tags', placeholder: 'Comma-separated genres (e.g., lofi, hiphop)', type: 'plain_text_input', required: true },
    { label: 'Lyrics', action_id: 'lyrics', placeholder: 'Lyrics to be sung (optional)', type: 'plain_text_input', required: false },
    { label: 'Duration', action_id: 'duration', placeholder: 'Duration in seconds (default: 60)', type: 'number_input', required: false },
    { label: 'Number of Steps', action_id: 'number_of_steps', placeholder: 'Number of steps (default: 27)', type: 'number_input', required: false },
    { label: 'Seed', action_id: 'seed', placeholder: 'Random seed (required)', type: 'number_input', required: true },
    { label: 'Scheduler', action_id: 'scheduler', placeholder: 'euler or heun (default: euler)', type: 'plain_text_input', required: false },
    { label: 'Guidance Type', action_id: 'guidance_type', placeholder: 'cfg, apg, or cfg_star (default: apg)', type: 'plain_text_input', required: false },
    { label: 'Granularity Scale', action_id: 'granularity_scale', placeholder: 'Granularity scale (default: 10)', type: 'number_input', required: false },
    { label: 'Guidance Interval', action_id: 'guidance_interval', placeholder: 'Guidance interval (default: 0.5)', type: 'number_input', required: false },
    { label: 'Guidance Interval Decay', action_id: 'guidance_interval_decay', placeholder: 'Guidance interval decay (default: 0)', type: 'number_input', required: false },
    { label: 'Guidance Scale', action_id: 'guidance_scale', placeholder: 'Guidance scale (default: 15)', type: 'number_input', required: false },
    { label: 'Minimum Guidance Scale', action_id: 'minimum_guidance_scale', placeholder: 'Minimum guidance scale (default: 3)', type: 'number_input', required: false },
    { label: 'Tag Guidance Scale', action_id: 'tag_guidance_scale', placeholder: 'Tag guidance scale (default: 5)', type: 'number_input', required: false },
    { label: 'Lyric Guidance Scale', action_id: 'lyric_guidance_scale', placeholder: 'Lyric guidance scale (default: 1.5)', type: 'number_input', required: false }
  ],
  'fal-ai/ace-step/prompt-to-audio': [
    { label: 'Prompt', action_id: 'prompt', placeholder: 'Describe the music/audio you want to generate...', type: 'plain_text_input', required: true },
    { label: 'Instrumental', action_id: 'instrumental', placeholder: 'Instrumental only? (true/false)', type: 'plain_text_input', required: false },
    { label: 'Duration', action_id: 'duration', placeholder: 'Duration in seconds (default: 60)', type: 'number_input', required: false },
    { label: 'Number of Steps', action_id: 'number_of_steps', placeholder: 'Number of steps (default: 27)', type: 'number_input', required: false },
    { label: 'Seed', action_id: 'seed', placeholder: 'Random seed (required)', type: 'number_input', required: true },
    { label: 'Scheduler', action_id: 'scheduler', placeholder: 'euler or heun (default: euler)', type: 'plain_text_input', required: false },
    { label: 'Guidance Type', action_id: 'guidance_type', placeholder: 'cfg, apg, or cfg_star (default: apg)', type: 'plain_text_input', required: false },
    { label: 'Granularity Scale', action_id: 'granularity_scale', placeholder: 'Granularity scale (default: 10)', type: 'number_input', required: false },
    { label: 'Guidance Interval', action_id: 'guidance_interval', placeholder: 'Guidance interval (default: 0.5)', type: 'number_input', required: false },
    { label: 'Guidance Interval Decay', action_id: 'guidance_interval_decay', placeholder: 'Guidance interval decay (default: 0)', type: 'number_input', required: false },
    { label: 'Guidance Scale', action_id: 'guidance_scale', placeholder: 'Guidance scale (default: 15)', type: 'number_input', required: false },
    { label: 'Minimum Guidance Scale', action_id: 'minimum_guidance_scale', placeholder: 'Minimum guidance scale (default: 3)', type: 'number_input', required: false },
    { label: 'Tag Guidance Scale', action_id: 'tag_guidance_scale', placeholder: 'Tag guidance scale (default: 5)', type: 'number_input', required: false },
    { label: 'Lyric Guidance Scale', action_id: 'lyric_guidance_scale', placeholder: 'Lyric guidance scale (default: 1.5)', type: 'number_input', required: false }
  ],
  'CassetteAI/music-generator': [
    { label: 'Prompt', action_id: 'prompt', placeholder: 'Describe the music you want to generate...', type: 'plain_text_input', required: true },
    { label: 'Duration', action_id: 'duration', placeholder: 'Duration in seconds (minimum: 10)', type: 'number_input', required: true, min: 10 }
  ],
  'cassetteai/sound-effects-generator': [
    { label: 'Prompt', action_id: 'prompt', placeholder: 'Describe the sound effect you want to generate...', type: 'plain_text_input', required: true },
    { label: 'Duration', action_id: 'duration', placeholder: 'Duration in seconds (minimum: 10)', type: 'number_input', required: true, min: 10 }
  ],
  'fal-ai/diffrhythm': [
    { label: 'Lyrics', action_id: 'lyrics', placeholder: 'Song lyrics (must include [chorus] or [verse] sections)', type: 'plain_text_input', required: true },
    { label: 'Reference Audio URL', action_id: 'reference_audio_url', placeholder: 'Reference audio URL (optional)', type: 'plain_text_input', required: false },
    { label: 'Style Prompt', action_id: 'style_prompt', placeholder: 'Style prompt (optional)', type: 'plain_text_input', required: false },
    { label: 'Music Duration', action_id: 'music_duration', placeholder: 'Music duration (95s or 285s)', type: 'plain_text_input', required: false },
    { label: 'CFG Strength', action_id: 'cfg_strength', placeholder: 'CFG strength (default: 4)', type: 'number_input', required: false },
    { label: 'Scheduler', action_id: 'scheduler', placeholder: 'Scheduler (euler, midpoint, rk4, implicit_adams)', type: 'plain_text_input', required: false },
    { label: 'Num Inference Steps', action_id: 'num_inference_steps', placeholder: 'Number of inference steps (default: 32)', type: 'number_input', required: false }
  ],
  'fal-ai/elevenlabs/sound-effects': [
    { label: 'Text', action_id: 'text', placeholder: 'Describe the sound effect to generate...', type: 'plain_text_input', required: true },
    { label: 'Duration Seconds', action_id: 'duration_seconds', placeholder: 'Duration in seconds (0.5-22)', type: 'number_input', required: false, min: 0.5, max: 22 },
    { label: 'Prompt Influence', action_id: 'prompt_influence', placeholder: 'How closely to follow the prompt (0-1, default 0.3)', type: 'number_input', required: false, min: 0, max: 1 }
  ],
  'fal-ai/yue': [
    { label: 'Lyrics', action_id: 'lyrics', placeholder: 'Song lyrics (must include [chorus] or [verse] sections)', type: 'plain_text_input', required: true },
    { label: 'Genres', action_id: 'genres', placeholder: 'Genres (space-separated)', type: 'plain_text_input', required: true }
  ],
  'fal-ai/mmaudio-v2/text-to-audio': [
    { label: 'Prompt', action_id: 'prompt', placeholder: 'Describe the audio to generate', type: 'plain_text_input', required: true },
    { label: 'Negative Prompt', action_id: 'negative_prompt', placeholder: 'Negative prompt (optional)', type: 'plain_text_input', required: false },
    { label: 'Seed', action_id: 'seed', placeholder: 'Seed (optional)', type: 'number_input', required: false },
    { label: 'Num Steps', action_id: 'num_steps', placeholder: 'Number of steps (default: 25)', type: 'number_input', required: false },
    { label: 'Duration', action_id: 'duration', placeholder: 'Duration in seconds (default: 8)', type: 'number_input', required: false },
    { label: 'CFG Strength', action_id: 'cfg_strength', placeholder: 'CFG strength (default: 4.5)', type: 'number_input', required: false },
    { label: 'Mask Away Clip', action_id: 'mask_away_clip', placeholder: 'Mask away clip? (true/false)', type: 'plain_text_input', required: false }
  ],
  'fal-ai/minimax-music': [
    { label: 'Prompt', action_id: 'prompt', placeholder: 'Lyrics (max 600 chars, use ## for accompaniment)', type: 'plain_text_input', required: true, maxLength: 600 },
    { label: 'Reference Audio URL', action_id: 'reference_audio_url', placeholder: 'Reference audio URL (.wav or .mp3, >15s, optional)', type: 'plain_text_input', required: false }
  ]
}; 