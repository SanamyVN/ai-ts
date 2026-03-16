import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceBusiness } from './voice.business.js';
import { VoiceTtsError, VoiceSttError } from './voice.error.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import {
  createMockMastraVoiceTts,
  createMockMastraVoiceStt,
} from '@/business/sdk/mastra/mastra.testing.js';
import { Readable } from 'node:stream';

describe('VoiceBusiness', () => {
  let mockTts: ReturnType<typeof createMockMastraVoiceTts>;
  let mockStt: ReturnType<typeof createMockMastraVoiceStt>;
  let business: VoiceBusiness;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTts = createMockMastraVoiceTts();
    mockStt = createMockMastraVoiceStt();
    business = new VoiceBusiness(mockTts, mockStt);
  });

  describe('textToSpeech', () => {
    it('delegates to TTS adapter and returns audio stream', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);

      const result = await business.textToSpeech({ text: 'hello', speaker: 'nova' });

      expect(mockTts.textToSpeech).toHaveBeenCalledWith('hello', { speaker: 'nova' });
      expect(result.audioStream).toBe(audioStream);
    });

    it('passes provider-specific options', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);

      await business.textToSpeech({ text: 'hello', options: { speed: 1.5 } });

      expect(mockTts.textToSpeech).toHaveBeenCalledWith('hello', { speed: 1.5 });
    });

    it('throws VoiceTtsError when provider returns void', async () => {
      mockTts.textToSpeech.mockResolvedValue(undefined);

      await expect(business.textToSpeech({ text: 'hello' })).rejects.toThrow(VoiceTtsError);
    });

    it('wraps adapter errors as VoiceTtsError', async () => {
      mockTts.textToSpeech.mockRejectedValue(
        new MastraAdapterError('textToSpeech', new Error('provider error')),
      );

      await expect(business.textToSpeech({ text: 'hello' })).rejects.toThrow(VoiceTtsError);
    });
  });

  describe('speechToText', () => {
    it('returns text when provider returns string', async () => {
      mockStt.speechToText.mockResolvedValue('hello world');
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });

      const result = await business.speechToText({ audioStream });

      expect(result).toEqual({ text: 'hello world' });
    });

    it('collects stream when provider returns a stream', async () => {
      const textStream = new Readable({
        read() {
          this.push('hello ');
          this.push('world');
          this.push(null);
        },
      });
      mockStt.speechToText.mockResolvedValue(textStream);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });

      const result = await business.speechToText({ audioStream });

      expect(result).toEqual({ text: 'hello world' });
    });

    it('throws VoiceSttError when provider returns void', async () => {
      mockStt.speechToText.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });

      await expect(business.speechToText({ audioStream })).rejects.toThrow(VoiceSttError);
    });

    it('wraps adapter errors as VoiceSttError', async () => {
      mockStt.speechToText.mockRejectedValue(
        new MastraAdapterError('speechToText', new Error('provider error')),
      );
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });

      await expect(business.speechToText({ audioStream })).rejects.toThrow(VoiceSttError);
    });
  });

  describe('getSpeakers', () => {
    it('returns speakers from TTS adapter', async () => {
      const speakers = [{ voiceId: 'alloy' }, { voiceId: 'nova' }];
      mockTts.getSpeakers.mockResolvedValue(speakers);

      const result = await business.getSpeakers();

      expect(result).toEqual({ speakers });
    });

    it('wraps adapter errors as VoiceTtsError', async () => {
      mockTts.getSpeakers.mockRejectedValue(
        new MastraAdapterError('getSpeakers', new Error('provider error')),
      );

      await expect(business.getSpeakers()).rejects.toThrow(VoiceTtsError);
    });
  });
});
