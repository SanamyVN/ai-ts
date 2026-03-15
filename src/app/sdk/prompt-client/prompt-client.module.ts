import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { PROMPT_MEDIATOR } from '@/business/domain/prompt/client/mediator.js';
import { PromptLocalMediator } from './prompt-local.mediator.js';
import {
  PromptRemoteMediator,
  AI_PROMPT_HTTP_CLIENT,
  AI_PROMPT_REMOTE_CONFIG,
  type HttpClient,
} from './prompt-remote.mediator.js';

interface StandaloneOptions {
  readonly baseUrl: string;
  readonly httpClientToken: IToken<HttpClient>;
}

/**
 * Prompt client providers for monolith deployment (in-process mediator).
 *
 * @example
 * container.load(promptClientMonolithProviders());
 */
export function promptClientMonolithProviders(): ProviderBundle {
  return {
    providers: [bind(PROMPT_MEDIATOR, PromptLocalMediator)],
    exports: [PROMPT_MEDIATOR],
  };
}

/**
 * Prompt client providers for standalone deployment (HTTP-based mediator).
 *
 * @example
 * container.load(promptClientStandaloneProviders({ baseUrl: 'https://ai.example.com', httpClientToken: MY_HTTP_CLIENT }));
 */
export function promptClientStandaloneProviders(options: StandaloneOptions): ProviderBundle {
  return {
    providers: [
      alias(AI_PROMPT_HTTP_CLIENT, options.httpClientToken),
      value(AI_PROMPT_REMOTE_CONFIG, { baseUrl: options.baseUrl }),
      bind(PROMPT_MEDIATOR, PromptRemoteMediator),
    ],
    exports: [PROMPT_MEDIATOR],
  };
}
