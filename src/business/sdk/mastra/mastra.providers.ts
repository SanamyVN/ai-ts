import { bind } from '@sanamyvn/foundation/di/node/providers';
import {
  MASTRA_AGENT,
  MASTRA_MEMORY,
  MASTRA_RAG,
  MASTRA_VOICE_TTS,
  MASTRA_VOICE_STT,
  MASTRA_VOICE_REALTIME,
} from './mastra.interface.js';
import { MastraAgentAdapter } from './adapters/mastra.agent.js';
import { MastraMemoryAdapter } from './adapters/mastra.memory.js';
import { MastraRagAdapter } from './adapters/mastra.rag.js';
import { MastraVoiceTtsAdapter } from './adapters/mastra.voice-tts.js';
import { MastraVoiceSttAdapter } from './adapters/mastra.voice-stt.js';
import { MastraVoiceRealtimeAdapter } from './adapters/mastra.voice-realtime.js';

/**
 * Returns the DI provider bindings for the Mastra SDK adapters.
 * Include this in your module's provider list to make `MASTRA_AGENT`,
 * `MASTRA_MEMORY`, `MASTRA_RAG`, `MASTRA_VOICE_TTS`, `MASTRA_VOICE_STT`,
 * and `MASTRA_VOICE_REALTIME` injectable throughout the business layer.
 *
 * @example
 * const module = createModule({
 *   ...mastraProviders(),
 * });
 */
export function mastraProviders() {
  return {
    providers: [
      bind(MASTRA_AGENT, MastraAgentAdapter),
      bind(MASTRA_MEMORY, MastraMemoryAdapter),
      bind(MASTRA_RAG, MastraRagAdapter),
      bind(MASTRA_VOICE_TTS, MastraVoiceTtsAdapter),
      bind(MASTRA_VOICE_STT, MastraVoiceSttAdapter),
      bind(MASTRA_VOICE_REALTIME, MastraVoiceRealtimeAdapter),
    ],
    exports: [
      MASTRA_AGENT,
      MASTRA_MEMORY,
      MASTRA_RAG,
      MASTRA_VOICE_TTS,
      MASTRA_VOICE_STT,
      MASTRA_VOICE_REALTIME,
    ],
  };
}
