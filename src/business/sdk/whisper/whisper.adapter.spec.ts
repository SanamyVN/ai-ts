import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { WhisperSttAdapter } from './whisper.adapter.js';
import type { WhisperConfig } from './whisper.adapter.js';
import { WhisperAdapterError } from './whisper.error.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:8000';
const DEFAULT_CONFIG: WhisperConfig = { baseUrl: BASE_URL };

function makeAudioStream(...chunks: Buffer[]): NodeJS.ReadableStream {
  const readable = new Readable({
    read() {
      // no-op
    },
  });
  for (const chunk of chunks) {
    readable.push(chunk);
  }
  readable.push(null);
  return readable;
}

const SILENT_PCM = Buffer.alloc(2);

function mockFetchSuccess(text: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ text }),
      text: async () => JSON.stringify({ text }),
    })),
  );
}

function mockFetchError(status: number, body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: false,
      status,
      text: async () => body,
    })),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WhisperSttAdapter', () => {
  let adapter: WhisperSttAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockFetchSuccess('hello world');
    adapter = new WhisperSttAdapter(DEFAULT_CONFIG);
  });

  describe('speechToText', () => {
    it('sends audio to /v1/audio/transcriptions and returns transcript', async () => {
      const stream = makeAudioStream(SILENT_PCM);

      const result = await adapter.speechToText(stream);

      expect(result).toBe('hello world');
      expect(fetch).toHaveBeenCalledTimes(1);
      const call = vi.mocked(fetch).mock.calls[0];
      expect(call?.[0]).toBe(`${BASE_URL}/v1/audio/transcriptions`);
      expect(call?.[1]?.method).toBe('POST');
    });

    it('sends the configured model in the form data', async () => {
      const customAdapter = new WhisperSttAdapter({
        baseUrl: BASE_URL,
        model: 'openai/whisper-large-v3',
      });
      const stream = makeAudioStream(SILENT_PCM);

      await customAdapter.speechToText(stream);

      const call = vi.mocked(fetch).mock.calls[0];
      const body = call?.[1]?.body;
      expect(body).toBeInstanceOf(FormData);
      if (body instanceof FormData) {
        expect(body.get('model')).toBe('openai/whisper-large-v3');
      }
    });

    it('uses default model when none configured', async () => {
      const stream = makeAudioStream(SILENT_PCM);

      await adapter.speechToText(stream);

      const call = vi.mocked(fetch).mock.calls[0];
      const body = call?.[1]?.body;
      if (body instanceof FormData) {
        expect(body.get('model')).toBe('Systran/faster-distil-whisper-small.en');
      }
    });

    it('trims trailing slash from baseUrl', async () => {
      const trailingSlash = new WhisperSttAdapter({ baseUrl: 'http://localhost:8000/' });
      const stream = makeAudioStream(SILENT_PCM);

      await trailingSlash.speechToText(stream);

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call?.[0]).toBe('http://localhost:8000/v1/audio/transcriptions');
    });

    it('wraps HTTP error responses as WhisperAdapterError', async () => {
      mockFetchError(500, 'Internal Server Error');
      const stream = makeAudioStream(SILENT_PCM);

      await expect(adapter.speechToText(stream)).rejects.toThrow(WhisperAdapterError);
    });

    it('wraps network errors as WhisperAdapterError', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('ECONNREFUSED');
        }),
      );
      const stream = makeAudioStream(SILENT_PCM);

      await expect(adapter.speechToText(stream)).rejects.toThrow(WhisperAdapterError);
    });

    it('wraps stream errors as WhisperAdapterError', async () => {
      const errStream = new Readable({
        read() {
          // no-op
        },
      });
      errStream.destroy(new Error('stream read error'));

      await expect(adapter.speechToText(errStream)).rejects.toThrow(WhisperAdapterError);
    });

    it('includes the original error as the cause', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('connection refused');
        }),
      );
      const stream = makeAudioStream(SILENT_PCM);

      let caught: unknown;
      try {
        await adapter.speechToText(stream);
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(WhisperAdapterError);
      if (caught instanceof WhisperAdapterError) {
        expect(caught.cause).toBeInstanceOf(Error);
      }
    });
  });

  describe('getListener', () => {
    it('returns { enabled: true }', async () => {
      const result = await adapter.getListener();
      expect(result).toEqual({ enabled: true });
    });
  });
});
