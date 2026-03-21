import { bind } from '@sanamyvn/foundation/di/node/providers';
import { REALTIME_VOICE_BUSINESS } from './realtime-voice.interface.js';
import { RealtimeVoiceBusiness } from './realtime-voice.business.js';

export function realtimeVoiceBusinessProviders() {
  return {
    providers: [bind(REALTIME_VOICE_BUSINESS, RealtimeVoiceBusiness)],
    exports: [REALTIME_VOICE_BUSINESS],
  };
}
