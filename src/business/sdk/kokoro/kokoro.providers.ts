import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_TTS } from '@/business/sdk/mastra/mastra.interface.js';
import { KokoroTtsAdapter } from './kokoro.adapter.js';

/**
 * Returns the DI provider bindings for the Kokoro TTS adapter.
 * Include this in your module's provider list to make `MASTRA_VOICE_TTS`
 * injectable throughout the business layer.
 *
 * @example
 * const module = createModule({
 *   ...kokoroProviders(),
 * });
 */
export function kokoroProviders() {
  return {
    providers: [bind(MASTRA_VOICE_TTS, KokoroTtsAdapter)],
    exports: [MASTRA_VOICE_TTS],
  };
}
