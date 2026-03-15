import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_AGENT, MASTRA_MEMORY } from './mastra.interface.js';
import { MastraAgentAdapter } from './adapters/mastra.agent.js';
import { MastraMemoryAdapter } from './adapters/mastra.memory.js';

/**
 * Returns the DI provider bindings for the Mastra SDK adapters.
 * Include this in your module's provider list to make `MASTRA_AGENT` and
 * `MASTRA_MEMORY` injectable throughout the business layer.
 *
 * @example
 * const module = createModule({
 *   ...mastraProviders(),
 * });
 */
export function mastraProviders() {
  return {
    providers: [bind(MASTRA_AGENT, MastraAgentAdapter), bind(MASTRA_MEMORY, MastraMemoryAdapter)],
    exports: [MASTRA_AGENT, MASTRA_MEMORY],
  };
}
