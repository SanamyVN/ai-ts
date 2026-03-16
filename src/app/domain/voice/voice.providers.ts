import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { VOICE_APP_SERVICE, VoiceAppService } from './voice.service.js';

export function voiceAppProviders(): ProviderBundle {
  return {
    providers: [bind(VOICE_APP_SERVICE, VoiceAppService)],
    exports: [VOICE_APP_SERVICE],
  };
}
