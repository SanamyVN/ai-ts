import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { VAD_MEDIATOR } from '@/business/domain/vad/client/mediator.js';
import { VadLocalMediator } from './vad-local.mediator.js';
import {
  VadRemoteMediator,
  AI_VAD_HTTP_CLIENT,
  AI_VAD_REMOTE_CONFIG,
  type HttpClient,
} from './vad-remote.mediator.js';

interface StandaloneOptions {
  readonly baseUrl: string;
  readonly httpClientToken: IToken<HttpClient>;
}

export function vadClientMonolithProviders(): ProviderBundle {
  return {
    providers: [bind(VAD_MEDIATOR, VadLocalMediator)],
    exports: [VAD_MEDIATOR],
  };
}

export function vadClientStandaloneProviders(options: StandaloneOptions): ProviderBundle {
  return {
    providers: [
      alias(AI_VAD_HTTP_CLIENT, options.httpClientToken),
      value(AI_VAD_REMOTE_CONFIG, { baseUrl: options.baseUrl }),
      bind(VAD_MEDIATOR, VadRemoteMediator),
    ],
    exports: [VAD_MEDIATOR],
  };
}
