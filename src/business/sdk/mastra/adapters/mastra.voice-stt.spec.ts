import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MastraVoiceSttAdapter } from './mastra.voice-stt.js';
import { MastraAdapterError } from '../mastra.error.js';
import { Readable } from 'node:stream';

function createMockVoice() {
  return {
    listen: vi.fn(),
    getListener: vi.fn(),
  };
}

describe('MastraVoiceSttAdapter', () => {
  let mockVoice: ReturnType<typeof createMockVoice>;
  let adapter: MastraVoiceSttAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVoice = createMockVoice();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    adapter = new MastraVoiceSttAdapter(mockVoice as never);
  });

  describe('speechToText', () => {
    it('delegates to voice.listen and returns the text', async () => {
      mockVoice.listen.mockResolvedValue('hello world');
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });

      const result = await adapter.speechToText(audioStream, { filetype: 'mp3' });

      expect(mockVoice.listen).toHaveBeenCalledWith(audioStream, { filetype: 'mp3' });
      expect(result).toBe('hello world');
    });

    it('returns a stream when provider returns a stream', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const textStream = new Readable({ read() {} });
      mockVoice.listen.mockResolvedValue(textStream);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });

      const result = await adapter.speechToText(audioStream);

      expect(result).toBe(textStream);
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.listen.mockRejectedValue(new Error('provider error'));
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });

      await expect(adapter.speechToText(audioStream)).rejects.toThrow(MastraAdapterError);
      await expect(adapter.speechToText(audioStream)).rejects.toThrow(/speechToText/);
    });
  });

  describe('getListener', () => {
    it('delegates to voice.getListener', async () => {
      mockVoice.getListener.mockResolvedValue({ enabled: true });

      const result = await adapter.getListener();

      expect(result).toEqual({ enabled: true });
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.getListener.mockRejectedValue(new Error('provider error'));

      await expect(adapter.getListener()).rejects.toThrow(MastraAdapterError);
      await expect(adapter.getListener()).rejects.toThrow(/getListener/);
    });
  });
});
