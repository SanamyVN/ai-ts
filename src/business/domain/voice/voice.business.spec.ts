import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceBusiness } from './voice.business.js';
import { VoiceTtsError, VoiceSttError } from './voice.error.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import {
  createMockMastraVoiceTts,
  createMockMastraVoiceStt,
} from '@/business/sdk/mastra/mastra.testing.js';
import { createMockAiMetrics } from '@/foundation/ai-metrics/ai-metrics.testing.js';
import type { IAiMetrics } from '@/foundation/ai-metrics/ai-metrics.interface.js';
import { Readable } from 'node:stream';

describe('VoiceBusiness', () => {
  let mockTts: ReturnType<typeof createMockMastraVoiceTts>;
  let mockStt: ReturnType<typeof createMockMastraVoiceStt>;
  let mockMetrics: ReturnType<typeof createMockAiMetrics>;
  let business: VoiceBusiness;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTts = createMockMastraVoiceTts();
    mockStt = createMockMastraVoiceStt();
    mockMetrics = createMockAiMetrics();
    const ttsConfig = { male: 'alloy', female: 'nova' };
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    business = new VoiceBusiness(mockTts, mockStt, ttsConfig, mockMetrics as unknown as IAiMetrics);
  });

  describe('textToSpeech', () => {
    it('delegates to TTS adapter and returns audio stream', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);

      const result = await business.textToSpeech({ text: 'hello', speakerGender: 'male' });

      expect(mockTts.textToSpeech).toHaveBeenCalledWith('hello', { speaker: 'alloy' });
      expect(result.audioStream).toBe(audioStream);
    });

    it('resolves female speakerGender to configured voice', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);

      await business.textToSpeech({ text: 'hello', speakerGender: 'female' });

      expect(mockTts.textToSpeech).toHaveBeenCalledWith('hello', { speaker: 'nova' });
    });

    it('passes provider-specific options with resolved speaker', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);

      await business.textToSpeech({
        text: 'hello',
        speakerGender: 'male',
        options: { speed: 1.5, speaker: 'override' },
      });

      expect(mockTts.textToSpeech).toHaveBeenCalledWith('hello', {
        speed: 1.5,
        speaker: 'alloy',
      });
    });

    it('throws VoiceTtsError when provider returns void', async () => {
      mockTts.textToSpeech.mockResolvedValue(undefined);

      await expect(business.textToSpeech({ text: 'hello', speakerGender: 'male' })).rejects.toThrow(
        VoiceTtsError,
      );
    });

    it('wraps adapter errors as VoiceTtsError', async () => {
      mockTts.textToSpeech.mockRejectedValue(
        new MastraAdapterError('textToSpeech', new Error('provider error')),
      );

      await expect(business.textToSpeech({ text: 'hello', speakerGender: 'male' })).rejects.toThrow(
        VoiceTtsError,
      );
    });

    it('emits TTS usage metrics with character count and metricsContext', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);
      const metricsContext = { 'ai.operation': 'tts_test' };

      await business.textToSpeech({ text: 'hello', speakerGender: 'male', metricsContext });

      expect(mockMetrics.recordTtsUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'tts-1',
          characterCount: 5,
          metricsContext,
        }),
      );
      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'tts-1',
          status: 'success',
          metricsContext,
        }),
      );
    });

    it('emits TTS operation error metric when provider fails', async () => {
      mockTts.textToSpeech.mockRejectedValue(
        new MastraAdapterError('textToSpeech', new Error('provider error')),
      );

      await expect(business.textToSpeech({ text: 'hello', speakerGender: 'male' })).rejects.toThrow(
        VoiceTtsError,
      );

      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'tts-1',
          status: 'error',
        }),
      );
      expect(mockMetrics.recordTtsUsage).not.toHaveBeenCalled();
    });

    it('emits TTS metrics without metricsContext when not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);

      await business.textToSpeech({ text: 'hi', speakerGender: 'male' });

      const call = mockMetrics.recordTtsUsage.mock.calls[0]?.[0];
      expect(call).toEqual({ model: 'tts-1', userId: 'unknown', characterCount: 2 });
      expect(call).not.toHaveProperty('metricsContext');
    });
  });

  describe('speechToText', () => {
    it('returns text when provider returns string', async () => {
      mockStt.speechToText.mockResolvedValue('hello world');
      const audioStream = new Readable({
        read() {
          this.push(null);
        },
      });

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
      const audioStream = new Readable({
        read() {
          this.push(null);
        },
      });

      const result = await business.speechToText({ audioStream });

      expect(result).toEqual({ text: 'hello world' });
    });

    it('throws VoiceSttError when provider returns void', async () => {
      mockStt.speechToText.mockResolvedValue(undefined);
      const audioStream = new Readable({
        read() {
          this.push(null);
        },
      });

      await expect(business.speechToText({ audioStream })).rejects.toThrow(VoiceSttError);
    });

    it('wraps adapter errors as VoiceSttError', async () => {
      mockStt.speechToText.mockRejectedValue(
        new MastraAdapterError('speechToText', new Error('provider error')),
      );
      const audioStream = new Readable({
        read() {
          this.push(null);
        },
      });

      await expect(business.speechToText({ audioStream })).rejects.toThrow(VoiceSttError);
    });

    it('emits STT usage metrics with audio duration computed from stream length (16000 * 2 bytes = 1 second)', async () => {
      mockStt.speechToText.mockResolvedValue('transcription');
      // 16000 samples * 2 bytes/sample = 32000 bytes = 1 second of PCM audio
      const pcmData = Buffer.alloc(16000 * 2, 0);
      const audioStream = Readable.from(pcmData);
      const metricsContext = { 'ai.operation': 'stt_test' };

      await business.speechToText({ audioStream, metricsContext });

      expect(mockMetrics.recordSttUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
          durationSeconds: 1,
          metricsContext,
        }),
      );
      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
          status: 'success',
          metricsContext,
        }),
      );
    });

    it('emits STT operation error metric when provider fails', async () => {
      mockStt.speechToText.mockRejectedValue(
        new MastraAdapterError('speechToText', new Error('provider error')),
      );
      const audioStream = new Readable({
        read() {
          this.push(null);
        },
      });

      await expect(business.speechToText({ audioStream })).rejects.toThrow(VoiceSttError);

      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
          status: 'error',
        }),
      );
      expect(mockMetrics.recordSttUsage).not.toHaveBeenCalled();
    });

    it('computes duration from PCM audio buffer (8000 * 2 bytes = 0.5 seconds)', async () => {
      mockStt.speechToText.mockResolvedValue('short clip');
      // 8000 samples * 2 bytes/sample = 16000 bytes = 0.5 seconds of PCM audio
      const pcmData = Buffer.alloc(8000 * 2, 0);
      const audioStream = Readable.from(pcmData);

      await business.speechToText({ audioStream });

      expect(mockMetrics.recordSttUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          durationSeconds: 0.5,
        }),
      );
    });

    it('uses provided durationSeconds without buffering when caller supplies it', async () => {
      mockStt.speechToText.mockResolvedValue('hello');
      const audioStream = new Readable({
        read() {
          this.push(Buffer.alloc(100));
          this.push(null);
        },
      });

      await business.speechToText({
        audioStream,
        durationSeconds: 3.5,
        metricsContext: { 'ai.operation': 'stt' },
      });

      // Should use the provided duration, not compute from buffer
      expect(mockMetrics.recordSttUsage).toHaveBeenCalledWith(
        expect.objectContaining({ durationSeconds: 3.5 }),
      );
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
