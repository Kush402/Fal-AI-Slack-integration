module.exports = [
  {
    label: 'Prompt',
    action_id: 'prompt',
    placeholder: 'Describe your image...',
    type: 'plain_text_input',
    required: true
  },
  {
    label: 'Aspect Ratio',
    action_id: 'aspect_ratio',
    placeholder: 'e.g., 1:1, 16:9',
    type: 'plain_text_input',
    required: false
  },
  {
    label: 'Style',
    action_id: 'style',
    placeholder: 'e.g., auto, realistic, cartoon',
    type: 'plain_text_input',
    required: false
  },
  {
    label: 'Seed',
    action_id: 'seed',
    placeholder: 'Random seed (optional)',
    type: 'plain_text_input',
    required: false
  },
  {
    label: 'Expand Prompt',
    action_id: 'expand_prompt',
    placeholder: 'true/false',
    type: 'plain_text_input',
    required: false
  },
  {
    label: 'Negative Prompt',
    action_id: 'negative_prompt',
    placeholder: 'What to avoid in the image',
    type: 'plain_text_input',
    required: false
  }
]; 