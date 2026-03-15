import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { SESSION_MEDIATOR } from '@/business/domain/session/client/mediator.js';
import { SessionLocalMediator } from './session-local.mediator.js';
import {
  SessionRemoteMediator,
  AI_SESSION_HTTP_CLIENT,
  AI_SESSION_REMOTE_CONFIG,
  type HttpClient,
} from './session-remote.mediator.js';

interface StandaloneOptions {
  readonly baseUrl: string;
  readonly httpClientToken: IToken<HttpClient>;
}

/**
 * Session client providers for monolith deployment (in-process mediator).
 *
 * @example
 * container.load(sessionClientMonolithProviders());
 */
export function sessionClientMonolithProviders(): ProviderBundle {
  return {
    providers: [bind(SESSION_MEDIATOR, SessionLocalMediator)],
    exports: [SESSION_MEDIATOR],
  };
}

/**
 * Session client providers for standalone deployment (HTTP-based mediator).
 *
 * @example
 * container.load(sessionClientStandaloneProviders({ baseUrl: 'https://ai.example.com', httpClientToken: MY_HTTP_CLIENT }));
 */
export function sessionClientStandaloneProviders(options: StandaloneOptions): ProviderBundle {
  return {
    providers: [
      alias(AI_SESSION_HTTP_CLIENT, options.httpClientToken),
      value(AI_SESSION_REMOTE_CONFIG, { baseUrl: options.baseUrl }),
      bind(SESSION_MEDIATOR, SessionRemoteMediator),
    ],
    exports: [SESSION_MEDIATOR],
  };
}
