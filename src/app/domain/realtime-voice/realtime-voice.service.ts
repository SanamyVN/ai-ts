import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import { RealtimeVoiceProcessAudioCommand } from '@/business/domain/realtime-voice/client/queries.js';
import { mapRealtimeVoiceError } from './realtime-voice.error.js';
import { toProcessAudioResponseDto } from './realtime-voice.mapper.js';
import type { ProcessAudioRequestDto, ProcessAudioResponseDto } from './realtime-voice.dto.js';

@Injectable()
export class RealtimeVoiceAppService {
  constructor(@Inject(AI_MEDIATOR) private readonly mediator: IMediator) {}

  async processAudio(input: ProcessAudioRequestDto): Promise<ProcessAudioResponseDto> {
    try {
      const result = await this.mediator.send(new RealtimeVoiceProcessAudioCommand(input));
      return toProcessAudioResponseDto(result);
    } catch (error) {
      mapRealtimeVoiceError(error);
    }
  }
}

export const REALTIME_VOICE_APP_SERVICE = createToken<RealtimeVoiceAppService>(
  'REALTIME_VOICE_APP_SERVICE',
);
