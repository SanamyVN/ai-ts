import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { Readable } from 'node:stream';
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
import { AI_METRICS } from '@/foundation/ai-metrics/ai-metrics.interface.js';
import type { IAiMetrics } from '@/foundation/ai-metrics/ai-metrics.interface.js';

const TTS_MODEL = 'tts-1';
const STT_MODEL = 'whisper-1';
const PCM_SAMPLE_RATE = 16000;

@Injectable()
export class VoiceBusiness implements IVoiceBusiness {
  constructor(
    @Inject(MASTRA_VOICE_TTS) private readonly tts: IMastraVoiceTts,
    @Inject(MASTRA_VOICE_STT) private readonly stt: IMastraVoiceStt,
    @Inject(VOICE_TTS_CONFIG) private readonly ttsConfig: VoiceTtsConfig,
    @Inject(AI_METRICS) private readonly aiMetrics: IAiMetrics,
  ) {}

  async textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechResult> {
    const start = performance.now();
    try {
      const speaker = this.ttsConfig[input.speakerGender];
      const { speaker: _ignoredSpeaker, ...providerOptions } = input.options ?? {};
      const audioStream = await this.tts.textToSpeech(input.text, {
        ...providerOptions,
        ...(speaker !== undefined ? { speaker } : {}),
      });
      if (!audioStream) throw new VoiceTtsError('Provider returned no audio stream');

      this.aiMetrics.recordTtsUsage({
        model: TTS_MODEL,
        userId: 'unknown',
        characterCount: input.text.length,
        ...(input.metricsContext !== undefined ? { metricsContext: input.metricsContext } : {}),
      });
      this.aiMetrics.recordOperation({
        model: TTS_MODEL,
        userId: 'unknown',
        status: 'success',
        latencyMs: performance.now() - start,
        ...(input.metricsContext !== undefined ? { metricsContext: input.metricsContext } : {}),
      });

      return { audioStream };
    } catch (error) {
      if (error instanceof VoiceTtsError) {
        this.aiMetrics.recordOperation({
          model: TTS_MODEL,
          userId: 'unknown',
          status: 'error',
          latencyMs: performance.now() - start,
          ...(input.metricsContext !== undefined ? { metricsContext: input.metricsContext } : {}),
        });
        throw error;
      }
      this.aiMetrics.recordOperation({
        model: TTS_MODEL,
        userId: 'unknown',
        status: 'error',
        latencyMs: performance.now() - start,
        ...(input.metricsContext !== undefined ? { metricsContext: input.metricsContext } : {}),
      });
      throw new VoiceTtsError('textToSpeech', error);
    }
  }

  async speechToText(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    const start = performance.now();
    try {
      const audioBuffer = await this.bufferStream(input.audioStream);
      const durationSeconds = audioBuffer.byteLength / 2 / PCM_SAMPLE_RATE;
      const audioReadable = Readable.from(audioBuffer);

      const result = await this.stt.speechToText(audioReadable, input.options);
      let text: string;
      if (typeof result === 'string') {
        text = result;
      } else if (!result) {
        throw new VoiceSttError('Provider returned no transcription');
      } else {
        text = await this.collectStream(result);
      }

      this.aiMetrics.recordSttUsage({
        model: STT_MODEL,
        userId: 'unknown',
        durationSeconds,
        ...(input.metricsContext !== undefined ? { metricsContext: input.metricsContext } : {}),
      });
      this.aiMetrics.recordOperation({
        model: STT_MODEL,
        userId: 'unknown',
        status: 'success',
        latencyMs: performance.now() - start,
        ...(input.metricsContext !== undefined ? { metricsContext: input.metricsContext } : {}),
      });

      return { text };
    } catch (error) {
      if (error instanceof VoiceSttError) {
        this.aiMetrics.recordOperation({
          model: STT_MODEL,
          userId: 'unknown',
          status: 'error',
          latencyMs: performance.now() - start,
          ...(input.metricsContext !== undefined ? { metricsContext: input.metricsContext } : {}),
        });
        throw error;
      }
      this.aiMetrics.recordOperation({
        model: STT_MODEL,
        userId: 'unknown',
        status: 'error',
        latencyMs: performance.now() - start,
        ...(input.metricsContext !== undefined ? { metricsContext: input.metricsContext } : {}),
      });
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

  private async bufferStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      chunks.push(Buffer.from(chunk as never));
    }
    return Buffer.concat(chunks);
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
