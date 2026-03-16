import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MastraVoiceTtsAdapter } from './mastra.voice-tts.js';
import { MastraAdapterError } from '../mastra.error.js';
import { Readable } from 'node:stream';

function createMockVoice() {
  return {
    speak: vi.fn(),
    getSpeakers: vi.fn(),
  };
}

describe('MastraVoiceTtsAdapter', () => {
  let mockVoice: ReturnType<typeof createMockVoice>;
  let adapter: MastraVoiceTtsAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVoice = createMockVoice();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    adapter = new MastraVoiceTtsAdapter(mockVoice as never);
  });

  describe('textToSpeech', () => {
    it('delegates to voice.speak and returns the audio stream', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });
      mockVoice.speak.mockResolvedValue(audioStream);

      const result = await adapter.textToSpeech('hello', { speaker: 'nova' });

      expect(mockVoice.speak).toHaveBeenCalledWith('hello', { speaker: 'nova' });
      expect(result).toBe(audioStream);
    });

    it('returns void when provider returns void', async () => {
      mockVoice.speak.mockResolvedValue(undefined);

      const result = await adapter.textToSpeech('hello');

      expect(result).toBeUndefined();
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.speak.mockRejectedValue(new Error('provider error'));

      await expect(adapter.textToSpeech('hello')).rejects.toThrow(MastraAdapterError);
      await expect(adapter.textToSpeech('hello')).rejects.toThrow(/textToSpeech/);
    });
  });

  describe('getSpeakers', () => {
    it('delegates to voice.getSpeakers', async () => {
      const speakers = [{ voiceId: 'alloy' }, { voiceId: 'nova' }];
      mockVoice.getSpeakers.mockResolvedValue(speakers);

      const result = await adapter.getSpeakers();

      expect(result).toEqual(speakers);
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.getSpeakers.mockRejectedValue(new Error('provider error'));

      await expect(adapter.getSpeakers()).rejects.toThrow(MastraAdapterError);
      await expect(adapter.getSpeakers()).rejects.toThrow(/getSpeakers/);
    });
  });
});
