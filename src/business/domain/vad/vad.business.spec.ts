import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VadBusiness } from './vad.business.js';
import { VadError } from './vad.error.js';
import type { IVad } from './vad.interface.js';
import type { DetectSpeechInput } from './vad.model.js';

function createMockVad(): IVad {
  return {
    processFrame: vi.fn(),
    reset: vi.fn(),
  };
}

describe('VadBusiness', () => {
  let vad: IVad;
  let business: VadBusiness;

  beforeEach(() => {
    vi.clearAllMocks();
    vad = createMockVad();
    business = new VadBusiness(vad);
  });

  describe('detectSpeech', () => {
    const input: DetectSpeechInput = {
      audio: new Int16Array([1, 2, 3]),
    };

    it('delegates to IVad.processFrame() and returns result', async () => {
      vi.mocked(vad.processFrame).mockResolvedValue({ isSpeech: true, probability: 0.95 });

      const result = await business.detectSpeech(input);

      expect(vad.processFrame).toHaveBeenCalledWith(input.audio);
      expect(result).toEqual({ isSpeech: true, probability: 0.95 });
    });

    it('wraps adapter errors as VadError', async () => {
      vi.mocked(vad.processFrame).mockRejectedValue(new Error('adapter failure'));

      await expect(business.detectSpeech(input)).rejects.toThrow(VadError);
    });
  });

  describe('resetSession', () => {
    it('delegates to IVad.reset()', () => {
      business.resetSession();

      expect(vad.reset).toHaveBeenCalledOnce();
    });
  });
});
