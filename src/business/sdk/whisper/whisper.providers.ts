import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_STT } from '@/business/sdk/mastra/mastra.interface.js';
import { WhisperSttAdapter } from './whisper.adapter.js';

/**
 * Returns the DI provider bindings for the Whisper STT adapter.
 * Reads STT configuration from `AI_CONFIG` (`sttModel`, `sttProvider`).
 */
export function whisperProviders() {
  return {
    providers: [bind(MASTRA_VOICE_STT, WhisperSttAdapter)],
    exports: [MASTRA_VOICE_STT],
  };
}
