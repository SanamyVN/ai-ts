import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_STT } from '@/business/sdk/mastra/mastra.interface.js';
import { WhisperSttAdapter } from './whisper.adapter.js';

/**
 * Returns the DI provider bindings for the Whisper STT adapter.
 * Include this in your module's provider list to make `MASTRA_VOICE_STT`
 * injectable throughout the business layer.
 *
 * @example
 * const module = createModule({
 *   ...whisperProviders(),
 * });
 */
export function whisperProviders() {
  return {
    providers: [bind(MASTRA_VOICE_STT, WhisperSttAdapter)],
    exports: [MASTRA_VOICE_STT],
  };
}
