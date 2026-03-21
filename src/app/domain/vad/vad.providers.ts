import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { VAD_APP_SERVICE, VadAppService } from './vad.service.js';

export function vadAppProviders(): ProviderBundle {
  return {
    providers: [bind(VAD_APP_SERVICE, VadAppService)],
    exports: [VAD_APP_SERVICE],
  };
}
