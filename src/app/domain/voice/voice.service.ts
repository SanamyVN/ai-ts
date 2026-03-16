import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import {
  VoiceTextToSpeechCommand,
  VoiceSpeechToTextCommand,
  VoiceGetSpeakersQuery,
} from '@/business/domain/voice/client/queries.js';
import { mapVoiceError } from './voice.error.js';
import { toSpeechToTextResponseDto, toGetSpeakersResponseDto } from './voice.mapper.js';
import type { TextToSpeechRequestDto } from './voice.dto.js';
import type { SpeechToTextResponseDto, GetSpeakersResponseDto } from './voice.dto.js';
import type { TextToSpeechClientResult } from '@/business/domain/voice/client/schemas.js';

@Injectable()
export class VoiceAppService {
  constructor(@Inject(AI_MEDIATOR) private readonly mediator: IMediator) {}

  async textToSpeech(input: TextToSpeechRequestDto): Promise<TextToSpeechClientResult> {
    try {
      return await this.mediator.send(new VoiceTextToSpeechCommand(input));
    } catch (error) {
      mapVoiceError(error);
    }
  }

  async speechToText(input: {
    audio: string;
    contentType: string;
    options?: Record<string, unknown>;
  }): Promise<SpeechToTextResponseDto> {
    try {
      const result = await this.mediator.send(new VoiceSpeechToTextCommand(input));
      return toSpeechToTextResponseDto(result);
    } catch (error) {
      mapVoiceError(error);
    }
  }

  async getSpeakers(): Promise<GetSpeakersResponseDto> {
    try {
      const result = await this.mediator.send(new VoiceGetSpeakersQuery({}));
      return toGetSpeakersResponseDto(result);
    } catch (error) {
      mapVoiceError(error);
    }
  }
}

export const VOICE_APP_SERVICE = createToken<VoiceAppService>('VOICE_APP_SERVICE');
