import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import { detectSpeechRequestDto, detectSpeechResponseDto } from './vad.dto.js';
import { VAD_APP_SERVICE, type VadAppService } from './vad.service.js';
import { VAD_MIDDLEWARE_CONFIG, type VadMiddlewareConfig } from './vad.tokens.js';

@Injectable()
export class VadRouter implements IRouter {
  readonly basePath = '/ai/vad';

  constructor(
    @Inject(VAD_APP_SERVICE) private readonly service: VadAppService,
    @Inject(VAD_MIDDLEWARE_CONFIG) private readonly middlewareConfig: VadMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .post('/detect-speech')
      .middleware(...(this.middlewareConfig.detectSpeech ?? []))
      .schema({ body: detectSpeechRequestDto, response: detectSpeechResponseDto })
      .handle(async ({ body }) => {
        return this.service.detectSpeech(body);
      });
  }
}
