import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KokoroTtsAdapter } from './kokoro.adapter.js';
import { KokoroAdapterError } from './kokoro.error.js';

// ---------------------------------------------------------------------------
// Mock kokoro-js — use vi.hoisted so variables are available inside vi.mock
// ---------------------------------------------------------------------------

const SAMPLE_VOICES = {
  af_heart: {
    name: 'Heart',
    language: 'en-us',
    gender: 'Female',
    targetQuality: 'A',
    overallGrade: 'A',
  },
  af_bella: {
    name: 'Bella',
    language: 'en-us',
    gender: 'Female',
    targetQuality: 'A',
    overallGrade: 'A-',
  },
  bm_george: {
    name: 'George',
    language: 'en-gb',
    gender: 'Male',
    targetQuality: 'B',
    overallGrade: 'C',
  },
};

// Minimal Float32Array audio — 4 samples of silence
const SILENT_AUDIO = new Float32Array([0, 0, 0, 0]);

const { mockGenerate, mockFromPretrained } = vi.hoisted(() => {
  const mockGenerate = vi.fn(async () => ({
    audio: new Float32Array([0, 0, 0, 0]),
    sampling_rate: 24000,
  }));
  const mockFromPretrained = vi.fn(async () => ({
    generate: mockGenerate,
    voices: {
      af_heart: {
        name: 'Heart',
        language: 'en-us',
        gender: 'Female',
        targetQuality: 'A',
        overallGrade: 'A',
      },
      af_bella: {
        name: 'Bella',
        language: 'en-us',
        gender: 'Female',
        targetQuality: 'A',
        overallGrade: 'A-',
      },
      bm_george: {
        name: 'George',
        language: 'en-gb',
        gender: 'Male',
        targetQuality: 'B',
        overallGrade: 'C',
      },
    },
  }));
  return { mockGenerate, mockFromPretrained };
});

vi.mock('kokoro-js', () => ({
  KokoroTTS: {
    from_pretrained: mockFromPretrained,
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KokoroTtsAdapter', () => {
  let adapter: KokoroTtsAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations after clearAllMocks
    mockGenerate.mockResolvedValue({ audio: SILENT_AUDIO, sampling_rate: 24000 });
    mockFromPretrained.mockResolvedValue({ generate: mockGenerate, voices: SAMPLE_VOICES });
    adapter = new KokoroTtsAdapter();
  });

  describe('textToSpeech', () => {
    it('returns a ReadableStream of audio data', async () => {
      const result = await adapter.textToSpeech('Hello world');

      expect(result).toBeDefined();
      // Verify it is a ReadableStream (has the pipe method)
      expect(typeof (result as NodeJS.ReadableStream).pipe).toBe('function');
      expect(mockGenerate).toHaveBeenCalledTimes(1);
      expect(mockGenerate).toHaveBeenCalledWith('Hello world', { voice: 'af_heart' });
    });

    it('uses the speaker option as the voice when provided', async () => {
      await adapter.textToSpeech('Hello world', { speaker: 'bm_george' });

      expect(mockGenerate).toHaveBeenCalledWith('Hello world', { voice: 'bm_george' });
    });

    it('falls back to the default voice when no speaker option is provided', async () => {
      await adapter.textToSpeech('Hello world', {});

      expect(mockGenerate).toHaveBeenCalledWith('Hello world', { voice: 'af_heart' });
    });

    it('accepts a ReadableStream as input and collects the text', async () => {
      const { Readable } = await import('node:stream');
      const inputStream = Readable.from(['Hello ', 'world']);

      await adapter.textToSpeech(inputStream);

      expect(mockGenerate).toHaveBeenCalledWith('Hello world', expect.any(Object));
    });

    it('wraps kokoro-js errors as KokoroAdapterError', async () => {
      mockGenerate.mockRejectedValueOnce(new Error('model inference failed'));

      await expect(adapter.textToSpeech('Hello')).rejects.toThrow(KokoroAdapterError);
    });

    it('includes the original error as the cause', async () => {
      const original = new Error('model inference failed');
      mockGenerate.mockRejectedValueOnce(original);

      let caught: unknown;
      try {
        await adapter.textToSpeech('Hello');
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(KokoroAdapterError);
      expect((caught as KokoroAdapterError).cause).toBe(original);
    });

    it('re-throws KokoroAdapterError without double-wrapping', async () => {
      const alreadyWrapped = new KokoroAdapterError('textToSpeech', new Error('inner'));
      mockGenerate.mockRejectedValueOnce(alreadyWrapped);

      await expect(adapter.textToSpeech('Hello')).rejects.toBe(alreadyWrapped);
    });

    it('loads the model lazily and reuses it on subsequent calls', async () => {
      await adapter.textToSpeech('First call');
      await adapter.textToSpeech('Second call');

      expect(mockFromPretrained).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSpeakers', () => {
    it('returns available voices with voiceId plus metadata', async () => {
      const speakers = await adapter.getSpeakers();

      expect(speakers).toHaveLength(Object.keys(SAMPLE_VOICES).length);
      expect(speakers[0]).toMatchObject({ voiceId: 'af_heart', name: 'Heart' });
      expect(speakers[1]).toMatchObject({ voiceId: 'af_bella', name: 'Bella' });
      expect(speakers[2]).toMatchObject({ voiceId: 'bm_george', name: 'George' });
    });

    it('wraps kokoro-js errors as KokoroAdapterError', async () => {
      const freshAdapter = new KokoroTtsAdapter();
      mockFromPretrained.mockRejectedValueOnce(new Error('model load failed'));

      await expect(freshAdapter.getSpeakers()).rejects.toThrow(KokoroAdapterError);
    });

    it('includes the original error as the cause for getSpeakers', async () => {
      const freshAdapter = new KokoroTtsAdapter();
      const original = new Error('model load failed');
      mockFromPretrained.mockRejectedValueOnce(original);

      let caught: unknown;
      try {
        await freshAdapter.getSpeakers();
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(KokoroAdapterError);
      expect((caught as KokoroAdapterError).cause).toBe(original);
    });
  });
});
