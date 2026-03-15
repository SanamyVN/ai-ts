import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { promptAppProviders } from './domain/prompt/prompt.providers.js';
import { sessionAppProviders } from './domain/session/session.providers.js';
import { conversationAppProviders } from './domain/conversation/conversation.providers.js';

export function aiAppProviders(): ProviderBundle {
  const prompt = promptAppProviders();
  const session = sessionAppProviders();
  const conversation = conversationAppProviders();

  return {
    providers: [...prompt.providers, ...session.providers, ...conversation.providers],
    exports: [...prompt.exports, ...session.exports, ...conversation.exports],
  };
}
