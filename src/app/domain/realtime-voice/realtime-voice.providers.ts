import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { REALTIME_VOICE_APP_SERVICE, RealtimeVoiceAppService } from './realtime-voice.service.js';

export function realtimeVoiceAppProviders(): ProviderBundle {
  return {
    providers: [bind(REALTIME_VOICE_APP_SERVICE, RealtimeVoiceAppService)],
    exports: [REALTIME_VOICE_APP_SERVICE],
  };
}
