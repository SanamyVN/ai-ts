import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { CONVERSATION_MEDIATOR } from '@/business/domain/conversation/client/mediator.js';
import { ConversationLocalMediator } from './conversation-local.mediator.js';
import {
  ConversationRemoteMediator,
  AI_CONVERSATION_HTTP_CLIENT,
  AI_CONVERSATION_REMOTE_CONFIG,
  type HttpClient,
} from './conversation-remote.mediator.js';

interface StandaloneOptions {
  readonly baseUrl: string;
  readonly httpClientToken: IToken<HttpClient>;
}

/**
 * Conversation client providers for monolith deployment (in-process mediator).
 *
 * @example
 * container.load(conversationClientMonolithProviders());
 */
export function conversationClientMonolithProviders(): ProviderBundle {
  return {
    providers: [bind(CONVERSATION_MEDIATOR, ConversationLocalMediator)],
    exports: [CONVERSATION_MEDIATOR],
  };
}

/**
 * Conversation client providers for standalone deployment (HTTP-based mediator).
 *
 * @example
 * container.load(conversationClientStandaloneProviders({ baseUrl: 'https://ai.example.com', httpClientToken: MY_HTTP_CLIENT }));
 */
export function conversationClientStandaloneProviders(options: StandaloneOptions): ProviderBundle {
  return {
    providers: [
      alias(AI_CONVERSATION_HTTP_CLIENT, options.httpClientToken),
      value(AI_CONVERSATION_REMOTE_CONFIG, { baseUrl: options.baseUrl }),
      bind(CONVERSATION_MEDIATOR, ConversationRemoteMediator),
    ],
    exports: [CONVERSATION_MEDIATOR],
  };
}
