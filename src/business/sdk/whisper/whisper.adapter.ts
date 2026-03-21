import { Injectable } from '@sanamyvn/foundation/di/node/decorators';
import { Whisper } from 'smart-whisper';
import type { IMastraVoiceStt } from '@/business/sdk/mastra/mastra.interface.js';
import { WhisperAdapterError } from './whisper.error.js';

/**
 * Wraps `smart-whisper` behind the stable `IMastraVoiceStt` interface.
 * Collects the incoming audio stream into a Buffer, converts it to a
 * mono 16 kHz Float32Array, and delegates transcription to Whisper.
 * All errors from smart-whisper are caught and re-thrown as
 * `WhisperAdapterError`.
 */
@Injectable()
export class WhisperSttAdapter implements IMastraVoiceStt {
  private readonly whisper: Whisper;

  constructor(modelPath: string) {
    this.whisper = new Whisper(modelPath);
  }

  async speechToText(
    audioStream: NodeJS.ReadableStream,
    _options?: Record<string, unknown>,
  ): Promise<string | NodeJS.ReadableStream | undefined> {
    try {
      const buffer = await collectStream(audioStream);
      const pcm = bufferToFloat32(buffer);
      const task = await this.whisper.transcribe(pcm, { language: 'auto' });
      const results = await task.result;
      return results
        .map((r) => r.text)
        .join(' ')
        .trim();
    } catch (error) {
      if (error instanceof WhisperAdapterError) {
        throw error;
      }
      throw new WhisperAdapterError('speechToText', error);
    }
  }

  async getListener(): Promise<{ enabled: boolean }> {
    return { enabled: true };
  }
}

/** Collects all chunks from a ReadableStream into a single Buffer. */
async function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Interprets the buffer as 16-bit signed PCM (little-endian) and converts
 * it to a normalized Float32Array in the range [-1, 1] required by Whisper.
 */
function bufferToFloat32(buffer: Buffer): Float32Array {
  const samples = buffer.byteLength / 2;
  const float32 = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    float32[i] = buffer.readInt16LE(i * 2) / 32768;
  }
  return float32;
}
