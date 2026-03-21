import { bind } from '@sanamyvn/foundation/di/node/providers';
import { VAD } from '@/business/domain/vad/vad.interface.js';
import { SileroVadAdapter } from './silero.adapter.js';

/**
 * Returns the DI provider bindings for the Silero VAD adapter.
 * Include this in your module's provider list to make `VAD` injectable
 * throughout the business layer.
 *
 * @example
 * const module = createModule({
 *   ...sileroProviders(),
 * });
 */
export function sileroProviders() {
  return {
    providers: [bind(VAD, SileroVadAdapter)],
    exports: [VAD],
  };
}
