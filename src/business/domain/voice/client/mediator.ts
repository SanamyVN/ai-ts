import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type {
  TextToSpeechClientResult,
  SpeechToTextClientResult,
  GetSpeakersClientResult,
} from './schemas.js';
import {
  VoiceTextToSpeechCommand,
  VoiceSpeechToTextCommand,
  VoiceGetSpeakersQuery,
} from './queries.js';

export interface IVoiceMediator {
  textToSpeech(
    command: InstanceType<typeof VoiceTextToSpeechCommand>,
  ): Promise<TextToSpeechClientResult>;
  speechToText(
    command: InstanceType<typeof VoiceSpeechToTextCommand>,
  ): Promise<SpeechToTextClientResult>;
  getSpeakers(query: InstanceType<typeof VoiceGetSpeakersQuery>): Promise<GetSpeakersClientResult>;
}

export const VOICE_MEDIATOR = createMediatorToken<IVoiceMediator>('VOICE_MEDIATOR', {
  textToSpeech: VoiceTextToSpeechCommand,
  speechToText: VoiceSpeechToTextCommand,
  getSpeakers: VoiceGetSpeakersQuery,
});
