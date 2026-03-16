import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IVoiceMediator } from '@/business/domain/voice/client/mediator.js';
import type {
  TextToSpeechClientResult,
  SpeechToTextClientResult,
  GetSpeakersClientResult,
} from '@/business/domain/voice/client/schemas.js';
import {
  textToSpeechResultSchema,
  speechToTextResultSchema,
  getSpeakersResultSchema,
} from '@/business/domain/voice/client/schemas.js';
import type {
  VoiceTextToSpeechCommand,
  VoiceSpeechToTextCommand,
  VoiceGetSpeakersQuery,
} from '@/business/domain/voice/client/queries.js';
import { VoiceClientTtsError, VoiceClientSttError } from '@/business/domain/voice/client/errors.js';

export interface HttpClient {
  post(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  get(
    url: string,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
}

export const AI_VOICE_HTTP_CLIENT = createToken<HttpClient>('AI_VOICE_HTTP_CLIENT');
export const AI_VOICE_REMOTE_CONFIG = createToken<{ baseUrl: string }>('AI_VOICE_REMOTE_CONFIG');

@Injectable()
export class VoiceRemoteMediator implements IVoiceMediator {
  constructor(
    @Inject(AI_VOICE_HTTP_CLIENT) private readonly http: HttpClient,
    @Inject(AI_VOICE_REMOTE_CONFIG) private readonly config: { baseUrl: string },
  ) {}

  async textToSpeech(
    command: InstanceType<typeof VoiceTextToSpeechCommand>,
  ): Promise<TextToSpeechClientResult> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/voice/text-to-speech`, {
      text: command.text,
      speaker: command.speaker,
      options: command.options,
    });
    if (!response.ok) {
      throw new VoiceClientTtsError(`Voice TTS failed: ${response.status}`);
    }
    return textToSpeechResultSchema.parse(response.body?.data);
  }

  async speechToText(
    command: InstanceType<typeof VoiceSpeechToTextCommand>,
  ): Promise<SpeechToTextClientResult> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/voice/speech-to-text`, {
      audio: command.audio,
      contentType: command.contentType,
      options: command.options,
    });
    if (!response.ok) {
      throw new VoiceClientSttError(`Voice STT failed: ${response.status}`);
    }
    return speechToTextResultSchema.parse(response.body?.data);
  }

  async getSpeakers(
    _query: InstanceType<typeof VoiceGetSpeakersQuery>,
  ): Promise<GetSpeakersClientResult> {
    const response = await this.http.get(`${this.config.baseUrl}/ai/voice/speakers`);
    if (!response.ok) {
      throw new VoiceClientTtsError(`Voice get speakers failed: ${response.status}`);
    }
    return getSpeakersResultSchema.parse(response.body?.data);
  }
}
