import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { ProcessAudioClientResult } from './schemas.js';
import { RealtimeVoiceProcessAudioCommand } from './queries.js';

export interface IRealtimeVoiceMediator {
  processAudio(
    command: InstanceType<typeof RealtimeVoiceProcessAudioCommand>,
  ): Promise<ProcessAudioClientResult>;
}

export const REALTIME_VOICE_MEDIATOR = createMediatorToken<IRealtimeVoiceMediator>(
  'REALTIME_VOICE_MEDIATOR',
  {
    processAudio: RealtimeVoiceProcessAudioCommand,
  },
);
