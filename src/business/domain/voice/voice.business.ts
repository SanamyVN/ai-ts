import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_VOICE_TTS, MASTRA_VOICE_STT } from '@/business/sdk/mastra/mastra.interface.js';
import type { IMastraVoiceTts, IMastraVoiceStt } from '@/business/sdk/mastra/mastra.interface.js';
import type { IVoiceBusiness, VoiceTtsConfig } from './voice.interface.js';
import { VOICE_TTS_CONFIG } from './voice.interface.js';
import type {
  TextToSpeechInput,
  TextToSpeechResult,
  SpeechToTextInput,
  SpeechToTextResult,
  GetSpeakersResult,
} from './voice.model.js';
import { VoiceTtsError, VoiceSttError } from './voice.error.js';

@Injectable()
export class VoiceBusiness implements IVoiceBusiness {
  constructor(
    @Inject(MASTRA_VOICE_TTS) private readonly tts: IMastraVoiceTts,
    @Inject(MASTRA_VOICE_STT) private readonly stt: IMastraVoiceStt,
    @Inject(VOICE_TTS_CONFIG) private readonly ttsConfig: VoiceTtsConfig,
  ) {}

  async textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechResult> {
    try {
      const speaker = this.ttsConfig[input.speakerGender];
      const { speaker: _ignoredSpeaker, ...providerOptions } = input.options ?? {};
      const audioStream = await this.tts.textToSpeech(input.text, {
        ...providerOptions,
        ...(speaker !== undefined ? { speaker } : {}),
      });
      if (!audioStream) throw new VoiceTtsError('Provider returned no audio stream');
      return { audioStream };
    } catch (error) {
      if (error instanceof VoiceTtsError) throw error;
      throw new VoiceTtsError('textToSpeech', error);
    }
  }

  async speechToText(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    try {
      const result = await this.stt.speechToText(input.audioStream, input.options);
      if (typeof result === 'string') return { text: result };
      if (!result) throw new VoiceSttError('Provider returned no transcription');
      return { text: await this.collectStream(result) };
    } catch (error) {
      if (error instanceof VoiceSttError) throw error;
      throw new VoiceSttError('speechToText', error);
    }
  }

  async getSpeakers(): Promise<GetSpeakersResult> {
    try {
      const speakers = await this.tts.getSpeakers();
      return { speakers };
    } catch (error) {
      throw new VoiceTtsError('getSpeakers', error);
    }
  }

  private async collectStream(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      chunks.push(Buffer.from(chunk as never));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
}
