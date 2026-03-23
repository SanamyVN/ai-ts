import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { VAD_BUSINESS, type IVadBusiness } from '@/business/domain/vad/vad.interface.js';
import type { IVadMediator } from '@/business/domain/vad/client/mediator.js';
import type { DetectSpeechClientResult } from '@/business/domain/vad/client/schemas.js';
import type { VadDetectSpeechCommand } from '@/business/domain/vad/client/queries.js';

@Injectable()
export class VadLocalMediator implements IVadMediator {
  constructor(@Inject(VAD_BUSINESS) private readonly vadBusiness: IVadBusiness) {}

  async detectSpeech(
    command: InstanceType<typeof VadDetectSpeechCommand>,
  ): Promise<DetectSpeechClientResult> {
    const buffer = Buffer.from(command.audio, 'base64');
    const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
    return this.vadBusiness.detectSpeech({ audio: int16 });
  }
}
