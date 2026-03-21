import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import { processAudioRequestDto, processAudioResponseDto } from './realtime-voice.dto.js';
import {
  REALTIME_VOICE_APP_SERVICE,
  type RealtimeVoiceAppService,
} from './realtime-voice.service.js';
import {
  REALTIME_VOICE_MIDDLEWARE_CONFIG,
  type RealtimeVoiceMiddlewareConfig,
} from './realtime-voice.tokens.js';

@Injectable()
export class RealtimeVoiceRouter implements IRouter {
  readonly basePath = '/ai/realtime-voice';

  constructor(
    @Inject(REALTIME_VOICE_APP_SERVICE) private readonly service: RealtimeVoiceAppService,
    @Inject(REALTIME_VOICE_MIDDLEWARE_CONFIG)
    private readonly middlewareConfig: RealtimeVoiceMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .post('/process-audio')
      .middleware(...(this.middlewareConfig.processAudio ?? []))
      .schema({ body: processAudioRequestDto, response: processAudioResponseDto })
      .handle(async ({ body }) => {
        return this.service.processAudio(body);
      });
  }
}
