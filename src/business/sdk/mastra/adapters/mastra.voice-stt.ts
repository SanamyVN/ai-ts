import type { MastraVoice } from '@mastra/core/voice';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_VOICE } from '../mastra.interface.js';
import type { IMastraVoiceStt } from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/core` voice instance behind the stable `IMastraVoiceStt`
 * interface. All exceptions from Mastra are caught and re-thrown as
 * `MastraAdapterError`.
 */
@Injectable()
export class MastraVoiceSttAdapter implements IMastraVoiceStt {
  constructor(@Inject(MASTRA_CORE_VOICE) private readonly voice: MastraVoice) {}

  async speechToText(
    audioStream: NodeJS.ReadableStream,
    options?: Record<string, unknown>,
  ): Promise<string | NodeJS.ReadableStream | undefined> {
    try {
      return (await this.voice.listen(audioStream, options)) ?? undefined;
    } catch (error) {
      throw new MastraAdapterError('speechToText', error);
    }
  }

  async getListener(): Promise<{ enabled: boolean }> {
    try {
      return await this.voice.getListener();
    } catch (error) {
      throw new MastraAdapterError('getListener', error);
    }
  }
}
