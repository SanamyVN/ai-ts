import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { mastraProviders } from './sdk/mastra/mastra.providers.js';
import { promptBusinessProviders } from './domain/prompt/prompt.providers.js';
import { sessionBusinessProviders } from './domain/session/session.providers.js';
import { conversationBusinessProviders } from './domain/conversation/conversation.providers.js';

export function aiBusinessProviders(): ProviderBundle {
  const mastra = mastraProviders();
  const prompt = promptBusinessProviders();
  const session = sessionBusinessProviders();
  const conversation = conversationBusinessProviders();

  return {
    providers: [
      ...mastra.providers,
      ...prompt.providers,
      ...session.providers,
      ...conversation.providers,
    ],
    exports: [...mastra.exports, ...prompt.exports, ...session.exports, ...conversation.exports],
  };
}
