import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMastraVoiceStt } from '@/business/sdk/mastra/mastra.interface.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import { OpenAiSttAdapterError } from './openai-stt.error.js';

/**
 * Wraps an OpenAI-compatible STT HTTP server behind the stable
 * `IMastraVoiceStt` interface. Sends audio to
 * `POST /v1/audio/transcriptions` as multipart/form-data.
 *
 * Configuration is read from `AI_CONFIG`:
 * - `sttProvider.url` — base URL of the STT server (defaults to OpenAI)
 * - `sttProvider.apiKey` — API key (required for cloud providers like OpenAI)
 * - `sttModel` — model name (e.g. 'whisper-1' for OpenAI, 'Systran/faster-distil-whisper-small.en' for local models)
 *
 * All errors are caught and re-thrown as `OpenAiSttAdapterError`.
 */
@Injectable()
export class OpenAiSttAdapter implements IMastraVoiceStt {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly headers: Record<string, string> | undefined;

  constructor(@Inject(AI_CONFIG) config: AiConfig) {
    const url = config.sttProvider?.url ?? 'https://api.openai.com';
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    this.model = config.sttModel ?? 'whisper-1';
    this.apiKey = config.sttProvider?.apiKey;
    this.headers = config.sttProvider?.headers;
  }

  async speechToText(
    audioStream: NodeJS.ReadableStream,
    _options?: Record<string, unknown>,
  ): Promise<string | NodeJS.ReadableStream | undefined> {
    try {
      const buffer = await collectStream(audioStream);

      // Wrap raw PCM in a WAV header so the STT server can decode it.
      // The audio is assumed to be 16kHz mono Int16 PCM (the standard
      // format used by the realtime voice pipeline).
      const wav = wrapPcmInWav(buffer, 16000, 1, 16);

      const formData = new FormData();
      formData.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
      formData.append('model', this.model);
      formData.append('response_format', 'json');

      const fetchHeaders: Record<string, string> = { ...this.headers };
      if (this.apiKey) {
        fetchHeaders['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        body: formData,
        headers: fetchHeaders,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`STT server returned ${String(response.status)}: ${body}`);
      }

      const json: unknown = await response.json();
      const text = isTranscriptionResult(json) ? json.text : undefined;
      if (text === undefined) {
        throw new Error('STT server returned unexpected response format');
      }
      return text.trim();
    } catch (error) {
      if (error instanceof OpenAiSttAdapterError) {
        throw error;
      }
      throw new OpenAiSttAdapterError('speechToText', error);
    }
  }

  async getListener(): Promise<{ enabled: boolean }> {
    return { enabled: true };
  }
}

interface TranscriptionResult {
  text: string;
}

function isTranscriptionResult(value: unknown): value is TranscriptionResult {
  if (typeof value !== 'object' || value === null || !('text' in value)) {
    return false;
  }
  return typeof value.text === 'string';
}

/**
 * Prepends a 44-byte RIFF/WAV header to raw PCM data so that
 * OpenAI-compatible STT servers can decode the audio correctly.
 */
function wrapPcmInWav(
  pcm: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0); // ChunkID
  header.writeUInt32LE(36 + pcm.length, 4); // ChunkSize
  header.write('WAVE', 8); // Format
  header.write('fmt ', 12); // Subchunk1ID
  header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(channels, 22); // NumChannels
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(byteRate, 28); // ByteRate
  header.writeUInt16LE(blockAlign, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
  header.write('data', 36); // Subchunk2ID
  header.writeUInt32LE(pcm.length, 40); // Subchunk2Size

  return Buffer.concat([header, pcm]);
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
