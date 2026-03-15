import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { CONVERSATION_APP_SERVICE, ConversationAppService } from './conversation.service.js';

export function conversationAppProviders(): ProviderBundle {
  return {
    providers: [bind(CONVERSATION_APP_SERVICE, ConversationAppService)],
    exports: [CONVERSATION_APP_SERVICE],
  };
}
