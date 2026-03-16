import { createCommand, createQuery } from '@sanamyvn/foundation/mediator/request';
import {
  textToSpeechClientSchema,
  textToSpeechResultSchema,
  speechToTextClientSchema,
  speechToTextResultSchema,
  getSpeakersResultSchema,
} from './schemas.js';
import { z } from 'zod';

export const VoiceTextToSpeechCommand = createCommand({
  type: 'ai.voice.textToSpeech',
  payload: textToSpeechClientSchema,
  response: textToSpeechResultSchema,
});

export const VoiceSpeechToTextCommand = createCommand({
  type: 'ai.voice.speechToText',
  payload: speechToTextClientSchema,
  response: speechToTextResultSchema,
});

export const VoiceGetSpeakersQuery = createQuery({
  type: 'ai.voice.getSpeakers',
  payload: z.object({}),
  response: getSpeakersResultSchema,
});
