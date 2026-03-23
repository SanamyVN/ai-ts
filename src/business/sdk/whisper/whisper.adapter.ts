import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMastraVoiceStt } from '@/business/sdk/mastra/mastra.interface.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import { WhisperAdapterError } from './whisper.error.js';

/**
 * Wraps an OpenAI-compatible STT HTTP server (e.g. Speaches, OpenAI)
 * behind the stable `IMastraVoiceStt` interface. Sends audio to
 * `POST /v1/audio/transcriptions` as multipart/form-data.
 *
 * Configuration is read from `AI_CONFIG`:
 * - `sttProvider.url` — base URL of the STT server (required for local models)
 * - `sttProvider.apiKey` — API key (required for cloud providers like OpenAI)
 * - `sttModel` — model name (e.g. 'whisper-1' for OpenAI, 'Systran/faster-distil-whisper-small.en' for Speaches)
 *
 * All errors are caught and re-thrown as `WhisperAdapterError`.
 */
@Injectable()
export class WhisperSttAdapter implements IMastraVoiceStt {
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

      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: 'audio/wav' }), 'audio.wav');
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

interface TranscriptionResult {
  text: string;
}

function isTranscriptionResult(value: unknown): value is TranscriptionResult {
  if (typeof value !== 'object' || value === null || !('text' in value)) {
    return false;
  }
  return typeof value.text === 'string';
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
