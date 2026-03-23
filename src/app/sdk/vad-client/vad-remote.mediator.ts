import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IVadMediator } from '@/business/domain/vad/client/mediator.js';
import type { DetectSpeechClientResult } from '@/business/domain/vad/client/schemas.js';
import { detectSpeechResultSchema } from '@/business/domain/vad/client/schemas.js';
import type { VadDetectSpeechCommand } from '@/business/domain/vad/client/queries.js';
import { VadClientError } from '@/business/domain/vad/client/errors.js';

export interface HttpClient {
  post(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
}

export const AI_VAD_HTTP_CLIENT = createToken<HttpClient>('AI_VAD_HTTP_CLIENT');
export const AI_VAD_REMOTE_CONFIG = createToken<{ baseUrl: string }>('AI_VAD_REMOTE_CONFIG');

@Injectable()
export class VadRemoteMediator implements IVadMediator {
  constructor(
    @Inject(AI_VAD_HTTP_CLIENT) private readonly http: HttpClient,
    @Inject(AI_VAD_REMOTE_CONFIG) private readonly config: { baseUrl: string },
  ) {}

  async detectSpeech(
    command: InstanceType<typeof VadDetectSpeechCommand>,
  ): Promise<DetectSpeechClientResult> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/vad/detect-speech`, {
      audio: command.audio,
    });
    if (!response.ok) {
      throw new VadClientError(`VAD detect-speech failed: ${response.status}`);
    }
    return detectSpeechResultSchema.parse(response.body?.data);
  }
}
