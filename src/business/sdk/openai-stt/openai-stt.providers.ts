import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_STT } from '@/business/sdk/mastra/mastra.interface.js';
import { OpenAiSttAdapter } from './openai-stt.adapter.js';

/**
 * Returns the DI provider bindings for the OpenAI-compatible STT adapter.
 * Reads STT configuration from `AI_CONFIG` (`sttModel`, `sttProvider`).
 *
 * Works with any OpenAI-compatible STT server (OpenAI, Speaches, etc.).
 */
export function openAiSttProviders() {
  return {
    providers: [bind(MASTRA_VOICE_STT, OpenAiSttAdapter)],
    exports: [MASTRA_VOICE_STT],
  };
}
