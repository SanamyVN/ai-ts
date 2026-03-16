import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { RAG_MEDIATOR } from '@/business/domain/rag/client/mediator.js';
import { RagLocalMediator } from './rag-local.mediator.js';
import {
  RagRemoteMediator,
  AI_RAG_HTTP_CLIENT,
  AI_RAG_REMOTE_CONFIG,
  type HttpClient,
} from './rag-remote.mediator.js';

interface StandaloneOptions {
  readonly baseUrl: string;
  readonly httpClientToken: IToken<HttpClient>;
}

/**
 * RAG client providers for monolith deployment (in-process mediator).
 *
 * @example
 * container.load(ragClientMonolithProviders());
 */
export function ragClientMonolithProviders(): ProviderBundle {
  return {
    providers: [bind(RAG_MEDIATOR, RagLocalMediator)],
    exports: [RAG_MEDIATOR],
  };
}

/**
 * RAG client providers for standalone deployment (HTTP-based mediator).
 *
 * @example
 * container.load(ragClientStandaloneProviders({ baseUrl: 'https://ai.example.com', httpClientToken: MY_HTTP_CLIENT }));
 */
export function ragClientStandaloneProviders(options: StandaloneOptions): ProviderBundle {
  return {
    providers: [
      alias(AI_RAG_HTTP_CLIENT, options.httpClientToken),
      value(AI_RAG_REMOTE_CONFIG, { baseUrl: options.baseUrl }),
      bind(RAG_MEDIATOR, RagRemoteMediator),
    ],
    exports: [RAG_MEDIATOR],
  };
}
