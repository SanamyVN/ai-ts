import { bind } from '@sanamyvn/foundation/di/node/providers';
import { VOICE_BUSINESS } from './voice.interface.js';
import { VoiceBusiness } from './voice.business.js';

export function voiceBusinessProviders() {
  return {
    providers: [bind(VOICE_BUSINESS, VoiceBusiness)],
    exports: [VOICE_BUSINESS],
  };
}
