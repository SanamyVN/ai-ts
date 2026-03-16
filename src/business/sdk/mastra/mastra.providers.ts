import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_AGENT, MASTRA_MEMORY, MASTRA_RAG } from './mastra.interface.js';
import { MastraAgentAdapter } from './adapters/mastra.agent.js';
import { MastraMemoryAdapter } from './adapters/mastra.memory.js';
import { MastraRagAdapter } from './adapters/mastra.rag.js';

/**
 * Returns the DI provider bindings for the Mastra SDK adapters.
 * Include this in your module's provider list to make `MASTRA_AGENT`,
 * `MASTRA_MEMORY`, and `MASTRA_RAG` injectable throughout the business layer.
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
    ],
    exports: [MASTRA_AGENT, MASTRA_MEMORY, MASTRA_RAG],
  };
}
