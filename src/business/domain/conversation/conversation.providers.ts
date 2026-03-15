import { bind } from '@sanamyvn/foundation/di/node/providers';
import { CONVERSATION_ENGINE } from './conversation.interface.js';
import { ConversationEngine } from './conversation.business.js';

/**
 * Returns the DI provider bindings for the conversation engine.
 * Include this in your module's provider list to make `CONVERSATION_ENGINE`
 * injectable throughout the business layer.
 *
 * @example
 * const module = createModule({
 *   ...conversationBusinessProviders(),
 * });
 */
export function conversationBusinessProviders() {
  return {
    providers: [bind(CONVERSATION_ENGINE, ConversationEngine)],
    exports: [CONVERSATION_ENGINE],
  };
}
