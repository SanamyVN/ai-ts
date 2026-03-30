import { bind, factory } from '@sanamyvn/foundation/di/node/providers';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import { VOICE_BUSINESS, VOICE_TTS_CONFIG, type VoiceTtsConfig } from './voice.interface.js';
import { VoiceBusiness } from './voice.business.js';

export function voiceBusinessProviders() {
  const voiceTtsConfigProvider = factory(
    VOICE_TTS_CONFIG,
    [AI_CONFIG],
    (config: AiConfig): VoiceTtsConfig => ({
      male: config.voices?.tts.male ?? 'alloy',
      female: config.voices?.tts.female ?? 'nova',
      defaultSpeakerGender: config.voices?.tts.defaultSpeakerGender ?? 'female',
    }),
  );

  return {
    providers: [voiceTtsConfigProvider, bind(VOICE_BUSINESS, VoiceBusiness)],
    exports: [VOICE_TTS_CONFIG, VOICE_BUSINESS],
  };
}
