module.exports = {
  'resemble-ai/chatterboxhd/text-to-speech': [
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Enter text...', required: true },
    { label: 'Voice', action_id: 'voice', type: 'plain_text_input', placeholder: 'Aurora, Blade, Britney, etc.', required: false },
    { label: 'Audio URL', action_id: 'audio_url', type: 'plain_text_input', placeholder: 'Voice sample URL (optional)', required: false },
    { label: 'Exaggeration', action_id: 'exaggeration', type: 'plain_text_input', placeholder: '0.25 (default)', required: false },
    { label: 'CFG', action_id: 'cfg', type: 'plain_text_input', placeholder: '0.5 (default)', required: false },
    { label: 'High Quality Audio', action_id: 'high_quality_audio', type: 'plain_text_input', placeholder: 'true/false', required: false },
    { label: 'Seed', action_id: 'seed', type: 'plain_text_input', placeholder: 'Random seed (optional)', required: false },
    { label: 'Temperature', action_id: 'temperature', type: 'plain_text_input', placeholder: '0.8 (default)', required: false }
  ],
  'fal-ai/orpheus-tts': [
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Enter text...', required: true },
    { label: 'Voice', action_id: 'voice', type: 'plain_text_input', placeholder: 'tara, leah, jess, etc.', required: false },
    { label: 'Temperature', action_id: 'temperature', type: 'plain_text_input', placeholder: '0.7 (default)', required: false },
    { label: 'Repetition Penalty', action_id: 'repetition_penalty', type: 'plain_text_input', placeholder: '1.2 (default)', required: false }
  ],
  'fal-ai/minimax/speech-02-hd': [
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Enter text...', required: true },
    { label: 'Voice Setting (JSON)', action_id: 'voice_setting', type: 'plain_text_input', placeholder: '{"voice_id":"Wise_Woman",...}', required: false },
    { label: 'Audio Setting (JSON)', action_id: 'audio_setting', type: 'plain_text_input', placeholder: '{"sample_rate":32000,...}', required: false },
    { label: 'Language Boost', action_id: 'language_boost', type: 'plain_text_input', placeholder: 'English, Chinese, etc.', required: false },
    { label: 'Output Format', action_id: 'output_format', type: 'plain_text_input', placeholder: 'url/hex', required: false },
    { label: 'Pronunciation Dict (JSON)', action_id: 'pronunciation_dict', type: 'plain_text_input', placeholder: '["燕少飞/(yan4)(shao3)(fei1)"]', required: false }
  ],
  'fal-ai/dia-tts': [
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Enter dialogue script...', required: true }
  ],
  'fal-ai/minimax/voice-clone': [
    { label: 'Audio URL', action_id: 'audio_url', type: 'plain_text_input', placeholder: 'Voice sample URL', required: true },
    { label: 'Noise Reduction', action_id: 'noise_reduction', type: 'plain_text_input', placeholder: 'true/false', required: false },
    { label: 'Volume Normalization', action_id: 'need_volume_normalization', type: 'plain_text_input', placeholder: 'true/false', required: false },
    { label: 'Accuracy', action_id: 'accuracy', type: 'plain_text_input', placeholder: '0-1', required: false },
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Preview text', required: false },
    { label: 'Model', action_id: 'model', type: 'plain_text_input', placeholder: 'speech-02-hd, etc.', required: false }
  ],
  'fal-ai/playai/tts/v3': [
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Enter the text to convert to speech...', required: true },
    { label: 'Voice', action_id: 'voice', type: 'plain_text_input', placeholder: 'Jennifer (English (US)/American), etc.', required: false },
    { label: 'Response Format', action_id: 'response_format', type: 'plain_text_input', placeholder: 'url/bytes', required: false },
    { label: 'Seed', action_id: 'seed', type: 'plain_text_input', placeholder: 'Random seed (optional)', required: false }
  ],
  'fal-ai/elevenlabs/tts/turbo-v2.5': [
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Enter text...', required: true },
    { label: 'Voice', action_id: 'voice', type: 'plain_text_input', placeholder: 'Aria, Rachel, etc.', required: false },
    { label: 'Stability', action_id: 'stability', type: 'plain_text_input', placeholder: '0-1 (0.5 default)', required: false },
    { label: 'Similarity Boost', action_id: 'similarity_boost', type: 'plain_text_input', placeholder: '0-1 (0.75 default)', required: false },
    { label: 'Style', action_id: 'style', type: 'plain_text_input', placeholder: '0-1', required: false },
    { label: 'Speed', action_id: 'speed', type: 'plain_text_input', placeholder: '0.7-1.2 (1 default)', required: false },
    { label: 'Timestamps', action_id: 'timestamps', type: 'plain_text_input', placeholder: 'true/false', required: false },
    { label: 'Previous Text', action_id: 'previous_text', type: 'plain_text_input', placeholder: 'Text before (optional)', required: false },
    { label: 'Next Text', action_id: 'next_text', type: 'plain_text_input', placeholder: 'Text after (optional)', required: false },
    { label: 'Language Code', action_id: 'language_code', type: 'plain_text_input', placeholder: 'en, es, fr, etc.', required: false }
  ],
  'fal-ai/minimax/speech-02-turbo': [
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Enter text...', required: true },
    { label: 'Voice Setting (JSON)', action_id: 'voice_setting', type: 'plain_text_input', placeholder: '{"voice_id":"Wise_Woman",...}', required: false },
    { label: 'Audio Setting (JSON)', action_id: 'audio_setting', type: 'plain_text_input', placeholder: '{"sample_rate":32000,...}', required: false },
    { label: 'Language Boost', action_id: 'language_boost', type: 'plain_text_input', placeholder: 'English, Chinese, etc.', required: false },
    { label: 'Output Format', action_id: 'output_format', type: 'plain_text_input', placeholder: 'url/hex', required: false },
    { label: 'Pronunciation Dict (JSON)', action_id: 'pronunciation_dict', type: 'plain_text_input', placeholder: '["燕少飞/(yan4)(shao3)(fei1)"]', required: false }
  ],
  'fal-ai/chatterbox/text-to-speech': [
    { label: 'Text', action_id: 'text', type: 'plain_text_input', placeholder: 'Enter text...', required: true },
    { label: 'Audio URL', action_id: 'audio_url', type: 'plain_text_input', placeholder: 'Voice sample URL (optional)', required: false },
    { label: 'Exaggeration', action_id: 'exaggeration', type: 'plain_text_input', placeholder: '0.25 (default)', required: false },
    { label: 'Temperature', action_id: 'temperature', type: 'plain_text_input', placeholder: '0.7 (default)', required: false },
    { label: 'CFG', action_id: 'cfg', type: 'plain_text_input', placeholder: '0.5 (default)', required: false },
    { label: 'Seed', action_id: 'seed', type: 'plain_text_input', placeholder: 'Random seed (optional)', required: false }
  ]
}; 