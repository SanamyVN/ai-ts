import { createCommand } from '@sanamyvn/foundation/mediator/request';
import { detectSpeechClientSchema, detectSpeechResultSchema } from './schemas.js';

export const VadDetectSpeechCommand = createCommand({
  type: 'ai.vad.detectSpeech',
  payload: detectSpeechClientSchema,
  response: detectSpeechResultSchema,
});
