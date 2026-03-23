import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_STT } from '@/business/sdk/mastra/mastra.interface.js';
import { WhisperSttAdapter, WHISPER_CONFIG } from './whisper.adapter.js';

export { WHISPER_CONFIG } from './whisper.adapter.js';
export type { WhisperConfig } from './whisper.adapter.js';

/**
 * Returns the DI provider bindings for the Whisper STT adapter.
 * Downstream must also provide `WHISPER_CONFIG` via `factory()` or `value()`.
 *
 * @example
 * ```ts
 * factory(WHISPER_CONFIG, [APP_CONFIG], (config) => ({
 *   baseUrl: config.whisper.baseUrl,
 *   model: config.whisper.model,
 * }))
 * ```
 */
export function whisperProviders() {
  return {
    providers: [bind(MASTRA_VOICE_STT, WhisperSttAdapter)],
    exports: [MASTRA_VOICE_STT, WHISPER_CONFIG],
  };
}
