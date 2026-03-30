import { Readable } from 'node:stream';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMastraVoiceTts, SpeakOptions } from '@/business/sdk/mastra/mastra.interface.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import { OpenAiTtsAdapterError } from './openai-tts.error.js';

const DEFAULT_VOICE = 'af_heart';

/**
 * Wraps an OpenAI-compatible TTS HTTP server behind the stable
 * `IMastraVoiceTts` interface. Sends text to `POST /v1/audio/speech`
 * and returns the audio as a readable stream.
 *
 * Configuration is read from `AI_CONFIG`:
 * - `ttsProvider.url` — base URL of the TTS server (defaults to OpenAI)
 * - `ttsProvider.apiKey` — API key (required for cloud providers like OpenAI)
 * - `ttsModel` — model name (e.g. 'tts-1' for OpenAI, 'speaches-ai/Kokoro-82M-v1.0-ONNX' for local models)
 *
 * All errors are caught and re-thrown as `OpenAiTtsAdapterError`.
 */
@Injectable()
export class OpenAiTtsAdapter implements IMastraVoiceTts {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly headers: Record<string, string> | undefined;

  constructor(@Inject(AI_CONFIG) config: AiConfig) {
    const url = config.ttsProvider?.url ?? 'https://api.openai.com';
    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    this.model = config.ttsModel ?? 'tts-1';
    this.apiKey = config.ttsProvider?.apiKey;
    this.headers = config.ttsProvider?.headers;
  }

  async textToSpeech(
    input: string | NodeJS.ReadableStream,
    options?: SpeakOptions,
  ): Promise<NodeJS.ReadableStream | undefined> {
    try {
      const text = typeof input === 'string' ? input : await collectStream(input);
      const voice = typeof options?.speaker === 'string' ? options.speaker : DEFAULT_VOICE;

      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.headers,
      };
      if (this.apiKey) {
        fetchHeaders['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          model: this.model,
          input: text,
          voice,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`TTS server returned ${String(response.status)}: ${body}`);
      }

      return responseToNodeReadable(response);
    } catch (error) {
      if (error instanceof OpenAiTtsAdapterError) {
        throw error;
      }
      throw new OpenAiTtsAdapterError('textToSpeech', error);
    }
  }

  async getSpeakers(): Promise<{ voiceId: string; [key: string]: unknown }[]> {
    try {
      const fetchHeaders: Record<string, string> = { ...this.headers };
      if (this.apiKey) {
        fetchHeaders['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(
        `${this.baseUrl}/v1/audio/speech/voices?model=${encodeURIComponent(this.model)}`,
        { headers: fetchHeaders },
      );

      if (!response.ok) {
        return [];
      }

      const json: unknown = await response.json();
      if (isVoiceListResult(json)) {
        return json.voices.map((v) => ({ voiceId: v.voice_id }));
      }
      return [];
    } catch (error) {
      if (error instanceof OpenAiTtsAdapterError) {
        throw error;
      }
      throw new OpenAiTtsAdapterError('getSpeakers', error);
    }
  }
}

/** Consume a fetch Response body into a Node.js Readable via arrayBuffer. */
async function responseToNodeReadable(response: Response): Promise<NodeJS.ReadableStream> {
  const buffer = Buffer.from(await response.arrayBuffer());
  return Readable.from([buffer]);
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

interface VoiceEntry {
  voice_id: string;
}

function isVoiceListResult(value: unknown): value is { voices: VoiceEntry[] } {
  if (typeof value !== 'object' || value === null || !('voices' in value)) {
    return false;
  }
  return Array.isArray(value.voices);
}
