import { createCommand } from '@sanamyvn/foundation/mediator/request';
import { processAudioClientSchema, processAudioResultSchema } from './schemas.js';

export const RealtimeVoiceProcessAudioCommand = createCommand({
  type: 'ai.realtimeVoice.processAudio',
  payload: processAudioClientSchema,
  response: processAudioResultSchema,
});
