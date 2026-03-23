import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_TTS } from '@/business/sdk/mastra/mastra.interface.js';
import { SpeachesTtsAdapter } from './speaches.adapter.js';

/**
 * Returns the DI provider bindings for the Speaches TTS adapter.
 * Reads TTS configuration from `AI_CONFIG` (`ttsModel`, `ttsProvider`).
 *
 * Works with any OpenAI-compatible TTS server (Speaches, OpenAI, etc.).
 */
export function speachesProviders() {
  return {
    providers: [bind(MASTRA_VOICE_TTS, SpeachesTtsAdapter)],
    exports: [MASTRA_VOICE_TTS],
  };
}
