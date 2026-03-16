import type { MastraVoice } from '@mastra/core/voice';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_VOICE } from '../mastra.interface.js';
import type { IMastraVoiceTts, SpeakOptions } from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/core` voice instance behind the stable `IMastraVoiceTts`
 * interface. All exceptions from Mastra are caught and re-thrown as
 * `MastraAdapterError`.
 */
@Injectable()
export class MastraVoiceTtsAdapter implements IMastraVoiceTts {
  constructor(@Inject(MASTRA_CORE_VOICE) private readonly voice: MastraVoice) {}

  async textToSpeech(
    input: string | NodeJS.ReadableStream,
    options?: SpeakOptions,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ): Promise<NodeJS.ReadableStream | void> {
    try {
      return await this.voice.speak(input, options);
    } catch (error) {
      throw new MastraAdapterError('textToSpeech', error);
    }
  }

  async getSpeakers(): Promise<{ voiceId: string; [key: string]: unknown }[]> {
    try {
      return await this.voice.getSpeakers();
    } catch (error) {
      throw new MastraAdapterError('getSpeakers', error);
    }
  }
}
