import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import { VadDetectSpeechCommand } from '@/business/domain/vad/client/queries.js';
import { mapVadError } from './vad.error.js';
import { toDetectSpeechResponseDto } from './vad.mapper.js';
import type { DetectSpeechRequestDto, DetectSpeechResponseDto } from './vad.dto.js';

@Injectable()
export class VadAppService {
  constructor(@Inject(AI_MEDIATOR) private readonly mediator: IMediator) {}

  async detectSpeech(input: DetectSpeechRequestDto): Promise<DetectSpeechResponseDto> {
    try {
      const result = await this.mediator.send(new VadDetectSpeechCommand(input));
      return toDetectSpeechResponseDto(result);
    } catch (error) {
      mapVadError(error);
    }
  }
}

export const VAD_APP_SERVICE = createToken<VadAppService>('VAD_APP_SERVICE');
