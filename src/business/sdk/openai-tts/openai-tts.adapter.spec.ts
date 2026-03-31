import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { OpenAiTtsAdapter } from './openai-tts.adapter.js';
import type { AiConfig } from '@/config.js';

const BASE_URL = 'http://localhost:8000';

function makeConfig(overrides?: Partial<Pick<AiConfig, 'ttsModel' | 'ttsProvider'>>): AiConfig {
  return {
    defaultModel: 'anthropic/claude-sonnet-4-20250514',
    prompt: { maxVersions: 50 },
    session: { transcriptPageSize: 100 },
    embeddingModel: 'openai/text-embedding-3-small',
    embeddingDimension: 1536,
    ttsProvider: { url: BASE_URL },
    ...overrides,
  };
}

function makeTextStream(...chunks: string[]): NodeJS.ReadableStream {
  const readable = new Readable({
    read() {
      // no-op
    },
  });
  for (const chunk of chunks) readable.push(chunk);
  readable.push(null);
  return readable;
}

function mockFetchSuccess() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      json: async () => ({ voices: [{ voice_id: 'alloy' }] }),
      text: async () => '',
    })),
  );
}

describe('OpenAiTtsAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockFetchSuccess();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes OpenAI /v1 base URLs before building the speech endpoint', async () => {
    const adapter = new OpenAiTtsAdapter(
      makeConfig({ ttsProvider: { url: 'https://api.openai.com/v1/' } }),
    );

    await adapter.textToSpeech('hello');

    const call = vi.mocked(fetch).mock.calls[0];
    expect(call?.[0]).toBe('https://api.openai.com/v1/audio/speech');
  });

  it('falls back to OPENAI_API_KEY for the default OpenAI provider', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-env-tts');
    const adapter = new OpenAiTtsAdapter(makeConfig({ ttsProvider: undefined }));

    await adapter.textToSpeech(makeTextStream('hello'));

    const call = vi.mocked(fetch).mock.calls[0];
    expect(call?.[1]?.headers).toMatchObject({ Authorization: 'Bearer sk-env-tts' });
  });
});
