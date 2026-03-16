import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import {
  textToSpeechRequestDto,
  speechToTextResponseDto,
  getSpeakersResponseDto,
} from './voice.dto.js';
import { VOICE_APP_SERVICE, type VoiceAppService } from './voice.service.js';
import { VOICE_MIDDLEWARE_CONFIG, type VoiceMiddlewareConfig } from './voice.tokens.js';

@Injectable()
export class VoiceRouter implements IRouter {
  readonly basePath = '/ai/voice';

  constructor(
    @Inject(VOICE_APP_SERVICE) private readonly service: VoiceAppService,
    @Inject(VOICE_MIDDLEWARE_CONFIG) private readonly middlewareConfig: VoiceMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .post('/text-to-speech')
      .middleware(...(this.middlewareConfig.textToSpeech ?? []))
      .schema({ body: textToSpeechRequestDto })
      .handle(async ({ body, ctx }) => {
        const result = await this.service.textToSpeech(body);
        const bytes = Buffer.from(result.audio, 'base64');
        return ctx.response(
          new Response(bytes, { headers: { 'Content-Type': result.contentType } }),
        );
      });

    app
      .post('/speech-to-text')
      .middleware(...(this.middlewareConfig.speechToText ?? []))
      .schema({ response: speechToTextResponseDto })
      .handle(async ({ ctx }) => {
        const formData = await ctx.formData();
        const file = formData.get('file');
        if (!(file instanceof File)) {
          return ctx.response(new Response('No audio file provided', { status: 400 }));
        }
        const buffer = await file.arrayBuffer();
        return this.service.speechToText({
          audio: Buffer.from(buffer).toString('base64'),
          contentType: file.type,
        });
      });

    app
      .get('/speakers')
      .middleware(...(this.middlewareConfig.getSpeakers ?? []))
      .schema({ response: getSpeakersResponseDto })
      .handle(async () => this.service.getSpeakers());
  }
}
