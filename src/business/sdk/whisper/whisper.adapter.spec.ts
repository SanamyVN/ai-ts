import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { WhisperSttAdapter } from './whisper.adapter.js';
import { WhisperAdapterError } from './whisper.error.js';

// ---------------------------------------------------------------------------
// Mock smart-whisper
// ---------------------------------------------------------------------------

const mockTranscribeTask = {
  result: Promise.resolve([{ from: 0, to: 1000, text: 'hello world' }]),
};

const mockWhisperInstance = {
  transcribe: vi.fn(async () => mockTranscribeTask),
};

vi.mock('smart-whisper', () => ({
  Whisper: class {
    transcribe = mockWhisperInstance.transcribe;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a ReadableStream that emits the given PCM buffer chunks. */
function makeAudioStream(...chunks: Buffer[]): NodeJS.ReadableStream {
  const readable = new Readable({ read() {} });
  for (const chunk of chunks) {
    readable.push(chunk);
  }
  readable.push(null);
  return readable;
}

/** A minimal 16-bit PCM buffer (2 bytes = 1 sample at 0). */
const SILENT_PCM = Buffer.alloc(2);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WhisperSttAdapter', () => {
  let adapter: WhisperSttAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribeTask.result = Promise.resolve([{ from: 0, to: 1000, text: 'hello world' }]);
    mockWhisperInstance.transcribe.mockResolvedValue(mockTranscribeTask);
    adapter = new WhisperSttAdapter('/path/to/model.bin');
  });

  describe('speechToText', () => {
    it('collects the audio stream and returns the transcript string', async () => {
      const stream = makeAudioStream(SILENT_PCM);

      const result = await adapter.speechToText(stream);

      expect(result).toBe('hello world');
      expect(mockWhisperInstance.transcribe).toHaveBeenCalledTimes(1);
    });

    it('concatenates multiple result segments with a space', async () => {
      mockTranscribeTask.result = Promise.resolve([
        { from: 0, to: 500, text: 'hello' },
        { from: 500, to: 1000, text: 'world' },
      ]);
      mockWhisperInstance.transcribe.mockResolvedValue(mockTranscribeTask);
      const stream = makeAudioStream(SILENT_PCM);

      const result = await adapter.speechToText(stream);

      expect(result).toBe('hello world');
    });

    it('wraps smart-whisper transcribe errors as WhisperAdapterError', async () => {
      mockWhisperInstance.transcribe.mockRejectedValueOnce(new Error('model load failed'));
      const stream = makeAudioStream(SILENT_PCM);

      await expect(adapter.speechToText(stream)).rejects.toThrow(WhisperAdapterError);
    });

    it('includes the original error as the cause', async () => {
      const original = new Error('model load failed');
      mockWhisperInstance.transcribe.mockRejectedValueOnce(original);
      const stream = makeAudioStream(SILENT_PCM);

      let caught: unknown;
      try {
        await adapter.speechToText(stream);
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(WhisperAdapterError);
      expect((caught as WhisperAdapterError).cause).toBe(original);
    });

    it('wraps stream errors as WhisperAdapterError', async () => {
      const errStream = new Readable({ read() {} });
      errStream.destroy(new Error('stream read error'));

      await expect(adapter.speechToText(errStream)).rejects.toThrow(WhisperAdapterError);
    });
  });

  describe('getListener', () => {
    it('returns { enabled: true }', async () => {
      const result = await adapter.getListener();

      expect(result).toEqual({ enabled: true });
    });
  });
});
