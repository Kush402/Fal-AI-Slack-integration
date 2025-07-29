module.exports = {
  'fal-ai/veo2/image-to-video': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe how the image should be animated...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Image URL',
      action_id: 'image_url',
      placeholder: 'Paste the image URL to animate',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['16:9', '4:3', '1:1', '9:21'],
      default: '16:9',
      required: true
    },
    {
      label: 'Duration',
      action_id: 'duration',
      type: 'static_select',
      options: ['5s', '6s', '7s', '8s'],
      default: '5s',
      required: false
    }
  ],
  'fal-ai/wan-i2v': [
    {
      label: 'Prompt',
      action_id: 'prompt',
      placeholder: 'Describe how the image should be animated...',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Image URL',
      action_id: 'image_url',
      placeholder: 'Paste the image URL to animate',
      type: 'plain_text_input',
      required: true
    },
    {
      label: 'Aspect Ratio',
      action_id: 'aspect_ratio',
      type: 'static_select',
      options: ['auto', 'auto_prefer_portrait', '16:9', '9:16'],
      default: 'auto',
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
      label: 'Num frames',
      action_id: 'num_frames',
      type: 'static_select',
      options: Array.from({length: 20}, (_, i) => (81 + i).toString()),
      default: '81',
      required: true
    }
  ]
}; 