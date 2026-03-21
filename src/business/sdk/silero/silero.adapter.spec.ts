import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SileroVadAdapter } from './silero.adapter.js';
import { SileroAdapterError } from './silero.error.js';

// ---------------------------------------------------------------------------
// Mock avr-vad
// ---------------------------------------------------------------------------

const mockVadInstance: {
  start: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  processAudio: ReturnType<typeof vi.fn>;
  options: Record<string, unknown>;
} = {
  start: vi.fn(),
  reset: vi.fn(),
  processAudio: vi.fn(),
  options: {},
};

vi.mock('avr-vad', () => ({
  RealTimeVAD: {
    new: vi.fn(async (opts: Record<string, unknown> = {}) => {
      mockVadInstance.options = {
        onFrameProcessed: opts['onFrameProcessed'] ?? vi.fn(),
        ...opts,
      };
      return mockVadInstance;
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default config matching adapter defaults. */
const DEFAULT_CONFIG = {
  speechThreshold: 0.5,
  silenceThreshold: 0.35,
  minSpeechFrames: 3,
  minSilenceDurationMs: 550,
};

/** Frame duration used inside the adapter (96 ms at 16 kHz / 1536 samples). */
const FRAME_DURATION_MS = 96;

/**
 * Configure processAudio to immediately fire onFrameProcessed with the given
 * isSpeech probability when called.
 */
function mockProbability(probability: number) {
  mockVadInstance.processAudio.mockImplementationOnce(async () => {
    const raw = mockVadInstance.options['onFrameProcessed'];
    if (typeof raw === 'function') {
      raw({ isSpeech: probability, notSpeech: 1 - probability });
    }
  });
}

/** Convenience: call processFrame with a dummy Int16Array. */
async function callProcessFrame(adapter: SileroVadAdapter, probability: number) {
  mockProbability(probability);
  return adapter.processFrame(new Int16Array(1536));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SileroVadAdapter', () => {
  let adapter: SileroVadAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVadInstance.options = {};
    adapter = new SileroVadAdapter(DEFAULT_CONFIG);
  });

  describe('processFrame – silence', () => {
    it('returns isSpeech=false and the raw probability for silence frames', async () => {
      const result = await callProcessFrame(adapter, 0.1);

      expect(result.isSpeech).toBe(false);
      expect(result.probability).toBeCloseTo(0.1);
    });

    it('returns probability=0 when avr-vad fires no callback', async () => {
      mockVadInstance.processAudio.mockResolvedValueOnce(undefined);

      const result = await adapter.processFrame(new Int16Array(1536));

      expect(result.isSpeech).toBe(false);
      expect(result.probability).toBe(0);
    });
  });

  describe('processFrame – speech above threshold', () => {
    it('returns isSpeech=true after minSpeechFrames consecutive frames above threshold', async () => {
      // frames 1 and 2 – not yet enough
      const r1 = await callProcessFrame(adapter, 0.9);
      const r2 = await callProcessFrame(adapter, 0.9);
      // frame 3 – should trigger speech
      const r3 = await callProcessFrame(adapter, 0.9);

      expect(r1.isSpeech).toBe(false);
      expect(r2.isSpeech).toBe(false);
      expect(r3.isSpeech).toBe(true);
    });

    it('returns the correct probability value even when isSpeech is true', async () => {
      await callProcessFrame(adapter, 0.9);
      await callProcessFrame(adapter, 0.9);
      const result = await callProcessFrame(adapter, 0.85);

      expect(result.probability).toBeCloseTo(0.85);
    });
  });

  describe('hysteresis – speech start', () => {
    it('does not start speech if streak is broken before minSpeechFrames', async () => {
      await callProcessFrame(adapter, 0.9); // frame 1 – speech
      await callProcessFrame(adapter, 0.1); // frame 2 – silence breaks streak
      const result = await callProcessFrame(adapter, 0.9); // frame 3 – restarts count

      expect(result.isSpeech).toBe(false);
    });

    it('starts speech exactly on the minSpeechFrames-th consecutive frame', async () => {
      const minFrames = DEFAULT_CONFIG.minSpeechFrames;
      let last: Awaited<ReturnType<typeof callProcessFrame>> | undefined;
      for (let i = 0; i < minFrames; i++) {
        last = await callProcessFrame(adapter, 0.9);
      }
      expect(last?.isSpeech).toBe(true);
    });
  });

  describe('hysteresis – speech end', () => {
    /** Helper: put adapter into speaking state. */
    async function enterSpeaking() {
      for (let i = 0; i < DEFAULT_CONFIG.minSpeechFrames; i++) {
        await callProcessFrame(adapter, 0.9);
      }
    }

    it('keeps isSpeech=true while silence duration is below minSilenceDurationMs', async () => {
      await enterSpeaking();

      // Number of silence frames that are still below the threshold
      const silenceFramesNeeded = Math.ceil(
        DEFAULT_CONFIG.minSilenceDurationMs / FRAME_DURATION_MS,
      );

      // Feed one fewer silence frame than needed
      let lastResult: Awaited<ReturnType<typeof callProcessFrame>> | undefined;
      for (let i = 0; i < silenceFramesNeeded - 1; i++) {
        lastResult = await callProcessFrame(adapter, 0.1);
      }
      expect(lastResult?.isSpeech).toBe(true);
    });

    it('transitions isSpeech=false once silence duration reaches minSilenceDurationMs', async () => {
      await enterSpeaking();

      const silenceFramesNeeded = Math.ceil(
        DEFAULT_CONFIG.minSilenceDurationMs / FRAME_DURATION_MS,
      );

      let lastResult: Awaited<ReturnType<typeof callProcessFrame>> | undefined;
      for (let i = 0; i < silenceFramesNeeded; i++) {
        lastResult = await callProcessFrame(adapter, 0.1);
      }
      expect(lastResult?.isSpeech).toBe(false);
    });

    it('resets silence counter when probability is between thresholds while speaking', async () => {
      await enterSpeaking();

      const silenceFramesNeeded = Math.ceil(
        DEFAULT_CONFIG.minSilenceDurationMs / FRAME_DURATION_MS,
      );

      // Feed almost enough silence frames…
      for (let i = 0; i < silenceFramesNeeded - 1; i++) {
        await callProcessFrame(adapter, 0.1);
      }

      // …then a mid-range frame (between thresholds) should reset the counter
      await callProcessFrame(adapter, 0.42);

      // Now even one more silence frame should NOT end speech
      const result = await callProcessFrame(adapter, 0.1);
      expect(result.isSpeech).toBe(true);
    });
  });

  describe('reset()', () => {
    it('clears hysteresis state so speech detection starts fresh', async () => {
      // Reach speaking state
      for (let i = 0; i < DEFAULT_CONFIG.minSpeechFrames; i++) {
        await callProcessFrame(adapter, 0.9);
      }

      adapter.reset();

      // After reset, a single speech frame should NOT activate speech
      const result = await callProcessFrame(adapter, 0.9);
      expect(result.isSpeech).toBe(false);
    });

    it('calls vad.reset() on the underlying RealTimeVAD instance', async () => {
      // Trigger lazy init
      await callProcessFrame(adapter, 0.1);

      adapter.reset();

      expect(mockVadInstance.reset).toHaveBeenCalledTimes(1);
    });

    it('does not throw when called before any processFrame (no vad instance yet)', () => {
      expect(() => adapter.reset()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('wraps avr-vad processAudio errors as SileroAdapterError', async () => {
      mockVadInstance.processAudio.mockRejectedValueOnce(new Error('onnx failure'));

      await expect(adapter.processFrame(new Int16Array(1536))).rejects.toThrow(SileroAdapterError);
    });

    it('wraps avr-vad init errors as SileroAdapterError', async () => {
      const { RealTimeVAD } = await import('avr-vad');
      vi.mocked(RealTimeVAD.new).mockRejectedValueOnce(new Error('model load failed'));

      await expect(adapter.processFrame(new Int16Array(1536))).rejects.toThrow(SileroAdapterError);
    });

    it('includes the original error as the cause', async () => {
      const original = new Error('onnx failure');
      mockVadInstance.processAudio.mockRejectedValueOnce(original);

      let caught: unknown;
      try {
        await adapter.processFrame(new Int16Array(1536));
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(SileroAdapterError);
      if (caught instanceof SileroAdapterError) {
        expect(caught.cause).toBe(original);
      }
    });

    it('wraps vad.reset() errors as SileroAdapterError', async () => {
      // Trigger lazy init first
      await callProcessFrame(adapter, 0.1);

      mockVadInstance.reset.mockImplementationOnce(() => {
        throw new Error('reset failed');
      });

      expect(() => adapter.reset()).toThrow(SileroAdapterError);
    });
  });
});
