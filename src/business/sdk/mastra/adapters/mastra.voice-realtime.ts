import type { MastraVoice } from '@mastra/core/voice';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_VOICE } from '../mastra.interface.js';
import type {
  IMastraVoiceRealtime,
  VoiceSessionOptions,
  VoiceEventCallback,
} from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/core` voice instance behind the stable `IMastraVoiceRealtime`
 * interface for realtime speech-to-speech session management. All exceptions
 * from Mastra are caught and re-thrown as `MastraAdapterError`.
 *
 * Maps to MastraVoice methods: connect → openSession, close → closeSession,
 * send → sendAudio, answer → triggerResponse, on → onEvent, off → offEvent.
 */
@Injectable()
export class MastraVoiceRealtimeAdapter implements IMastraVoiceRealtime {
  constructor(@Inject(MASTRA_CORE_VOICE) private readonly voice: MastraVoice) {}

  async openSession(options?: VoiceSessionOptions): Promise<void> {
    try {
      await this.voice.connect(options);
    } catch (error) {
      throw new MastraAdapterError('openSession', error);
    }
  }

  closeSession(): void {
    try {
      this.voice.close();
    } catch (error) {
      throw new MastraAdapterError('closeSession', error);
    }
  }

  async sendAudio(audioData: NodeJS.ReadableStream | Int16Array): Promise<void> {
    try {
      await this.voice.send(audioData);
    } catch (error) {
      throw new MastraAdapterError('sendAudio', error);
    }
  }

  async sendText(text: string): Promise<void> {
    try {
      await this.voice.speak(text);
    } catch (error) {
      throw new MastraAdapterError('sendText', error);
    }
  }

  async triggerResponse(options?: Record<string, unknown>): Promise<void> {
    try {
      await this.voice.answer(options);
    } catch (error) {
      throw new MastraAdapterError('triggerResponse', error);
    }
  }

  onEvent(event: string, callback: VoiceEventCallback): void {
    try {
      this.voice.on(event, callback);
    } catch (error) {
      throw new MastraAdapterError('onEvent', error);
    }
  }

  offEvent(event: string, callback: VoiceEventCallback): void {
    try {
      this.voice.off(event, callback);
    } catch (error) {
      throw new MastraAdapterError('offEvent', error);
    }
  }

  addTools(tools: Record<string, unknown>): void {
    try {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this.voice.addTools(tools as never);
    } catch (error) {
      throw new MastraAdapterError('addTools', error);
    }
  }

  addInstructions(instructions: string): void {
    try {
      this.voice.addInstructions(instructions);
    } catch (error) {
      throw new MastraAdapterError('addInstructions', error);
    }
  }

  updateConfig(options: Record<string, unknown>): void {
    try {
      this.voice.updateConfig(options);
    } catch (error) {
      throw new MastraAdapterError('updateConfig', error);
    }
  }
}
