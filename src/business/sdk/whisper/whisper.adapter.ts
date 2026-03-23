import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IMastraVoiceStt } from '@/business/sdk/mastra/mastra.interface.js';
import { WhisperAdapterError } from './whisper.error.js';

const DEFAULT_MODEL = 'Systran/faster-distil-whisper-small.en';

export interface WhisperConfig {
  readonly baseUrl: string;
  readonly model?: string;
}

export const WHISPER_CONFIG = createToken<WhisperConfig>('WHISPER_CONFIG');

/**
 * Wraps an OpenAI-compatible Whisper HTTP server (e.g. Speaches) behind
 * the stable `IMastraVoiceStt` interface. Sends audio to
 * `POST /v1/audio/transcriptions` as multipart/form-data.
 * All errors are caught and re-thrown as `WhisperAdapterError`.
 */
@Injectable()
export class WhisperSttAdapter implements IMastraVoiceStt {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(@Inject(WHISPER_CONFIG) config: WhisperConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async speechToText(
    audioStream: NodeJS.ReadableStream,
    _options?: Record<string, unknown>,
  ): Promise<string | NodeJS.ReadableStream | undefined> {
    try {
      const buffer = await collectStream(audioStream);

      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: 'audio/wav' }), 'audio.wav');
      formData.append('model', this.model);
      formData.append('response_format', 'json');

      const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Whisper server returned ${String(response.status)}: ${body}`);
      }

      const json = (await response.json()) as { text: string };
      return json.text.trim();
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
