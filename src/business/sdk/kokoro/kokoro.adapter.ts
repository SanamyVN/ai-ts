import { Readable } from 'node:stream';
import { Injectable } from '@sanamyvn/foundation/di/node/decorators';
import { KokoroTTS } from 'kokoro-js';
import type { IMastraVoiceTts, SpeakOptions } from '@/business/sdk/mastra/mastra.interface.js';
import { KokoroAdapterError } from './kokoro.error.js';

const DEFAULT_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DEFAULT_VOICE = 'af_heart';

/**
 * Wraps `kokoro-js` behind the stable `IMastraVoiceTts` interface.
 * The model is loaded lazily on first use via `KokoroTTS.from_pretrained`.
 * All errors from kokoro-js are caught and re-thrown as `KokoroAdapterError`.
 */
@Injectable()
export class KokoroTtsAdapter implements IMastraVoiceTts {
  private ttsPromise: Promise<KokoroTTS> | null = null;

  constructor(
    private readonly modelId: string = DEFAULT_MODEL_ID,
    private readonly dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' = 'q8',
  ) {}

  private getOrLoadTts(): Promise<KokoroTTS> {
    if (!this.ttsPromise) {
      this.ttsPromise = KokoroTTS.from_pretrained(this.modelId, {
        dtype: this.dtype,
        device: 'cpu',
      });
    }
    return this.ttsPromise;
  }

  async textToSpeech(
    input: string | NodeJS.ReadableStream,
    options?: SpeakOptions,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ): Promise<NodeJS.ReadableStream | void> {
    try {
      const text = typeof input === 'string' ? input : await collectStream(input);
      const voice = typeof options?.speaker === 'string' ? options.speaker : DEFAULT_VOICE;

      const tts = await this.getOrLoadTts();
      const rawAudio = await tts.generate(text, { voice });

      // Convert the Float32Array audio data to a Buffer and wrap in a Readable stream.
      const buffer = float32ToBuffer(rawAudio.audio);
      const readable = Readable.from([buffer]);
      return readable;
    } catch (error) {
      if (error instanceof KokoroAdapterError) {
        throw error;
      }
      throw new KokoroAdapterError('textToSpeech', error);
    }
  }

  async getSpeakers(): Promise<{ voiceId: string; [key: string]: unknown }[]> {
    try {
      const tts = await this.getOrLoadTts();
      return Object.entries(tts.voices).map(([voiceId, meta]) => ({
        voiceId,
        ...meta,
      }));
    } catch (error) {
      if (error instanceof KokoroAdapterError) {
        throw error;
      }
      throw new KokoroAdapterError('getSpeakers', error);
    }
  }
}

/** Collects all chunks from a ReadableStream into a single string. */
async function collectStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

/**
 * Converts a Float32Array (audio samples in [-1, 1]) to a 16-bit PCM Buffer
 * (little-endian), which is a standard interchange format for audio data.
 */
function float32ToBuffer(samples: Float32Array): Buffer {
  const buffer = Buffer.allocUnsafe(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i] ?? 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  return buffer;
}
