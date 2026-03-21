import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { VAD } from './vad.interface.js';
import type { IVad, IVadBusiness } from './vad.interface.js';
import type { DetectSpeechInput, VadResult } from './vad.model.js';
import { VadError } from './vad.error.js';

@Injectable()
export class VadBusiness implements IVadBusiness {
  constructor(@Inject(VAD) private readonly vad: IVad) {}

  async detectSpeech(input: DetectSpeechInput): Promise<VadResult> {
    try {
      const frame = await this.vad.processFrame(input.audio);
      return { isSpeech: frame.isSpeech, probability: frame.probability };
    } catch (error) {
      if (error instanceof VadError) throw error;
      throw new VadError('detectSpeech', error);
    }
  }

  resetSession(): void {
    this.vad.reset();
  }
}
