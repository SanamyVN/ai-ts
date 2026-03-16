import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { promptAppProviders } from './domain/prompt/prompt.providers.js';
import { sessionAppProviders } from './domain/session/session.providers.js';
import { conversationAppProviders } from './domain/conversation/conversation.providers.js';
import { ragAppProviders } from './domain/rag/rag.providers.js';

export function aiAppProviders(): ProviderBundle {
  const prompt = promptAppProviders();
  const session = sessionAppProviders();
  const conversation = conversationAppProviders();
  const rag = ragAppProviders();

  return {
    providers: [
      ...prompt.providers,
      ...session.providers,
      ...conversation.providers,
      ...rag.providers,
    ],
    exports: [...prompt.exports, ...session.exports, ...conversation.exports, ...rag.exports],
  };
}
