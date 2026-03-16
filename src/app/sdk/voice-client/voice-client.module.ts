import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { VOICE_MEDIATOR } from '@/business/domain/voice/client/mediator.js';
import { VoiceLocalMediator } from './voice-local.mediator.js';
import {
  VoiceRemoteMediator,
  AI_VOICE_HTTP_CLIENT,
  AI_VOICE_REMOTE_CONFIG,
  type HttpClient,
} from './voice-remote.mediator.js';

interface StandaloneOptions {
  readonly baseUrl: string;
  readonly httpClientToken: IToken<HttpClient>;
}

export function voiceClientMonolithProviders(): ProviderBundle {
  return {
    providers: [bind(VOICE_MEDIATOR, VoiceLocalMediator)],
    exports: [VOICE_MEDIATOR],
  };
}

export function voiceClientStandaloneProviders(options: StandaloneOptions): ProviderBundle {
  return {
    providers: [
      alias(AI_VOICE_HTTP_CLIENT, options.httpClientToken),
      value(AI_VOICE_REMOTE_CONFIG, { baseUrl: options.baseUrl }),
      bind(VOICE_MEDIATOR, VoiceRemoteMediator),
    ],
    exports: [VOICE_MEDIATOR],
  };
}
