import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { VOICE_BUSINESS, type IVoiceBusiness } from '@/business/domain/voice/voice.interface.js';
import type { IVoiceMediator } from '@/business/domain/voice/client/mediator.js';
import type {
  TextToSpeechClientResult,
  SpeechToTextClientResult,
  GetSpeakersClientResult,
} from '@/business/domain/voice/client/schemas.js';
import type {
  VoiceTextToSpeechCommand,
  VoiceSpeechToTextCommand,
  VoiceGetSpeakersQuery,
} from '@/business/domain/voice/client/queries.js';
import {
  toTextToSpeechClientResult,
  toSpeechToTextClientResult,
  toGetSpeakersClientResult,
} from './voice.mapper.js';
import { Readable } from 'node:stream';

@Injectable()
export class VoiceLocalMediator implements IVoiceMediator {
  constructor(@Inject(VOICE_BUSINESS) private readonly voiceBusiness: IVoiceBusiness) {}

  async textToSpeech(
    command: InstanceType<typeof VoiceTextToSpeechCommand>,
  ): Promise<TextToSpeechClientResult> {
    const result = await this.voiceBusiness.textToSpeech({
      text: command.text,
      speakerGender: command.speakerGender,
      ...(command.options !== undefined ? { options: command.options } : {}),
    });
    return toTextToSpeechClientResult(result);
  }

  async speechToText(
    command: InstanceType<typeof VoiceSpeechToTextCommand>,
  ): Promise<SpeechToTextClientResult> {
    const buffer = Buffer.from(command.audio, 'base64');
    const audioStream = Readable.from(buffer);
    const result = await this.voiceBusiness.speechToText({
      audioStream,
      ...(command.options !== undefined ? { options: command.options } : {}),
    });
    return toSpeechToTextClientResult(result);
  }

  async getSpeakers(
    _query: InstanceType<typeof VoiceGetSpeakersQuery>,
  ): Promise<GetSpeakersClientResult> {
    const result = await this.voiceBusiness.getSpeakers();
    return toGetSpeakersClientResult(result);
  }
}
