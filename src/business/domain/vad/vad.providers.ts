import { bind } from '@sanamyvn/foundation/di/node/providers';
import { VAD_BUSINESS } from './vad.interface.js';
import { VadBusiness } from './vad.business.js';

export function vadBusinessProviders() {
  return {
    providers: [bind(VAD_BUSINESS, VadBusiness)],
    exports: [VAD_BUSINESS],
  };
}
