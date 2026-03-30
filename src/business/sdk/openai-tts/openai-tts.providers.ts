import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_TTS } from '@/business/sdk/mastra/mastra.interface.js';
import { OpenAiTtsAdapter } from './openai-tts.adapter.js';

/**
 * Returns the DI provider bindings for the OpenAI-compatible TTS adapter.
 * Reads TTS configuration from `AI_CONFIG` (`ttsModel`, `ttsProvider`).
 *
 * Works with any OpenAI-compatible TTS server (OpenAI, Speaches, etc.).
 */
export function openAiTtsProviders() {
  return {
    providers: [bind(MASTRA_VOICE_TTS, OpenAiTtsAdapter)],
    exports: [MASTRA_VOICE_TTS],
  };
}
