import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockMediator } from '@sanamyvn/foundation/mediator/testing';
import type { MockMediator } from '@sanamyvn/foundation/mediator/testing';
import { RealtimeVoiceBusiness } from './realtime-voice.business.js';
import { aiConfigSchema } from '@/config.js';
import type { IAiMetrics } from '@/foundation/ai-metrics/ai-metrics.interface.js';
import { createMockAiMetrics } from '@/foundation/ai-metrics/ai-metrics.testing.js';

function makeSpeechAudio(): Int16Array {
  return new Int16Array([100, 200, 300]);
}

function makeSilenceAudio(): Int16Array {
  return new Int16Array([0, 0, 0]);
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function hasCommandType(value: unknown, type: string): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Reflect.get(value, 'type') === type;
}

describe('RealtimeVoiceBusiness', () => {
  let mediator: MockMediator;
  let business: RealtimeVoiceBusiness;
  let mockAiMetrics: ReturnType<typeof createMockAiMetrics>;

  beforeEach(() => {
    vi.clearAllMocks();
    mediator = createMockMediator();
    mockAiMetrics = createMockAiMetrics();
    business = new RealtimeVoiceBusiness(
      mediator,
      aiConfigSchema.parse({
        voices: {
          tts: {
            male: 'alloy',
            female: 'nova',
          },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      mockAiMetrics as unknown as IAiMetrics,
    );
  });

  function mockVad(isSpeech: boolean, probability = 0.9) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mediator.send.mockResolvedValueOnce({ isSpeech, probability } as never);
  }

  function mockFullChain() {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mediator.send.mockResolvedValueOnce({ text: 'hello world' } as never); // STT
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mediator.send.mockResolvedValueOnce({ text: 'Hi there!' } as never); // LLM
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mediator.send.mockResolvedValueOnce({
      audio: 'dHRzLWF1ZGlv',
      contentType: 'audio/wav',
    } as never); // TTS
  }

  describe('processAudio', () => {
    it('lazily initializes state and returns empty events on first call', async () => {
      mockVad(false, 0.1);

      const result = await business.processAudio({
        conversationId: 'conv-1',
        audio: makeSilenceAudio(),
      });

      expect(result.vad).toEqual({ isSpeech: false, probability: 0.1 });
      expect(result.events).toEqual([]);
    });

    it('buffers audio when VAD detects speech', async () => {
      mockVad(true);

      const result = await business.processAudio({
        conversationId: 'conv-1',
        audio: makeSpeechAudio(),
      });

      expect(result.vad.isSpeech).toBe(true);
      expect(result.events).toEqual([]);
    });

    it('triggers chain on end-of-speech and returns stateChange on next call', async () => {
      // Frame 1: speech
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSpeechAudio() });

      // Frame 2: silence (end of speech) — triggers fire-and-forget chain
      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });

      // Let the async chain run
      await flushMicrotasks();

      // Frame 3: drain events
      mockVad(false, 0.1);
      const result = await business.processAudio({
        conversationId: 'conv-1',
        audio: makeSilenceAudio(),
      });

      expect(result.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'stateChange', state: 'transcribing' }),
          expect.objectContaining({ type: 'transcript', text: 'hello world' }),
          expect.objectContaining({ type: 'stateChange', state: 'answering' }),
          expect.objectContaining({ type: 'stateChange', state: 'synthesizing' }),
          expect.objectContaining({ type: 'agentResponse', text: 'Hi there!' }),
          expect.objectContaining({
            type: 'audio',
            audio: 'dHRzLWF1ZGlv',
            contentType: 'audio/wav',
          }),
          expect.objectContaining({ type: 'stateChange', state: 'listening' }),
        ]),
      );
    });

    it('falls back to male speakerGender when none provided in input', async () => {
      // Frame 1: speech without speakerGender
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSpeechAudio() });

      // Frame 2: silence -> triggers chain
      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });
      await flushMicrotasks();

      const calls = vi.mocked(mediator.send).mock.calls;
      const ttsCall = calls.find(([command]) => hasCommandType(command, 'ai.voice.textToSpeech'));

      expect(ttsCall?.[0]).toEqual(
        expect.objectContaining({
          speakerGender: 'male',
        }),
      );
    });

    it('uses per-conversation speakerGender from processAudio input over config default', async () => {
      // Frame 1: speech with speakerGender='female'
      mockVad(true);
      await business.processAudio({
        conversationId: 'conv-gender',
        audio: makeSpeechAudio(),
        speakerGender: 'female',
      });

      // Frame 2: silence -> triggers chain
      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({
        conversationId: 'conv-gender',
        audio: makeSilenceAudio(),
        speakerGender: 'female',
      });
      await flushMicrotasks();

      const calls = vi.mocked(mediator.send).mock.calls;
      const ttsCall = calls.find(([command]) => hasCommandType(command, 'ai.voice.textToSpeech'));

      expect(ttsCall?.[0]).toEqual(
        expect.objectContaining({
          speakerGender: 'female',
        }),
      );
    });

    it('does not trigger a new chain when state is not listening', async () => {
      // Frame 1: speech
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSpeechAudio() });

      // Frame 2: silence → triggers chain
      // Make STT hang so state stays in transcribing
      mockVad(false, 0.1);
      const sttDeferred = createDeferred<{ text: string }>();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      mediator.send.mockReturnValueOnce(sttDeferred.promise as never); // STT hangs

      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });
      await flushMicrotasks();

      // Frame 3: more speech while transcribing — should NOT trigger another chain
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSpeechAudio() });

      // Frame 4: silence while transcribing — should NOT trigger chain
      mockVad(false, 0.1);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });

      // send called: VAD(1) + VAD(2) + STT(hangs) + VAD(3) + VAD(4) = 5 calls
      // If chain were triggered again we'd see extra STT calls
      expect(mediator.send).toHaveBeenCalledTimes(5);

      // Resolve the STT to clean up
      sttDeferred.resolve({ text: 'test' });
    });

    it('maintains separate state per conversationId', async () => {
      mockVad(false, 0.1);
      mockVad(true, 0.95);

      const r1 = await business.processAudio({
        conversationId: 'conv-a',
        audio: makeSilenceAudio(),
      });
      const r2 = await business.processAudio({
        conversationId: 'conv-b',
        audio: makeSpeechAudio(),
      });

      expect(r1.vad.isSpeech).toBe(false);
      expect(r2.vad.isSpeech).toBe(true);
    });

    it('queues error event and resets state when STT fails', async () => {
      // Frame 1: speech
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSpeechAudio() });

      // Frame 2: silence → triggers chain, STT will fail
      mockVad(false, 0.1);
      vi.mocked(mediator.send).mockRejectedValueOnce(new Error('STT service unavailable')); // STT fails

      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });
      await flushMicrotasks();

      // Frame 3: drain events — should see stateChange:transcribing + error
      mockVad(false, 0.1);
      const result = await business.processAudio({
        conversationId: 'conv-1',
        audio: makeSilenceAudio(),
      });

      expect(result.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'stateChange', state: 'transcribing' }),
          expect.objectContaining({ type: 'error', message: 'STT service unavailable' }),
        ]),
      );
    });

    it('converts Int16Array to base64 correctly in VAD payload', async () => {
      const audio = new Int16Array([1, 2, 3]);
      const expectedBase64 = Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength).toString(
        'base64',
      );

      mockVad(false, 0.1);
      await business.processAudio({ conversationId: 'conv-1', audio });

      expect(mediator.send).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expectedBase64,
        }),
      );
    });

    it('converts concatenated audio buffer to base64 for STT', async () => {
      const audio1 = new Int16Array([10, 20]);
      const audio2 = new Int16Array([30, 40]);
      const combined = new Int16Array([10, 20, 30, 40]);
      const expectedBase64 = Buffer.from(
        combined.buffer,
        combined.byteOffset,
        combined.byteLength,
      ).toString('base64');

      // Frame 1: speech
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: audio1 });

      // Frame 2: speech
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: audio2 });

      // Frame 3: silence → triggers chain
      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });
      await flushMicrotasks();

      // Find the STT call (4th call to send: VAD, VAD, VAD, STT, LLM, TTS)
      const calls = vi.mocked(mediator.send).mock.calls;
      const sttCall = calls[3];
      expect(sttCall).toBeDefined();
      expect(sttCall?.[0]).toEqual(
        expect.objectContaining({
          audio: expectedBase64,
          contentType: 'audio/pcm;rate=16000',
        }),
      );
    });

    it('state resets to listening after error so new speech can be processed', async () => {
      // Trigger an error first
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSpeechAudio() });

      mockVad(false, 0.1);
      vi.mocked(mediator.send).mockRejectedValueOnce(new Error('fail'));
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });
      await flushMicrotasks();

      // Drain error events
      mockVad(false, 0.1);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });

      // Now new speech should work normally
      mockVad(true);
      const result = await business.processAudio({
        conversationId: 'conv-1',
        audio: makeSpeechAudio(),
      });
      expect(result.vad.isSpeech).toBe(true);
      expect(result.events).toEqual([]);
    });

    it('includes pre-buffer frames in STT audio on speech onset', async () => {
      const preFrame1 = new Int16Array([1, 2]);
      const preFrame2 = new Int16Array([3, 4]);
      const speechFrame = new Int16Array([50, 60]);
      const combined = new Int16Array([1, 2, 3, 4, 50, 60]);
      const expectedBase64 = Buffer.from(
        combined.buffer,
        combined.byteOffset,
        combined.byteLength,
      ).toString('base64');

      // Frame 1-2: silence → fills pre-buffer
      mockVad(false, 0.1);
      await business.processAudio({ conversationId: 'conv-1', audio: preFrame1 });
      mockVad(false, 0.1);
      await business.processAudio({ conversationId: 'conv-1', audio: preFrame2 });

      // Frame 3: speech onset → flushes pre-buffer + current frame
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: speechFrame });

      // Frame 4: silence → triggers chain
      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });
      await flushMicrotasks();

      // Find the STT call
      const calls = vi.mocked(mediator.send).mock.calls;
      const sttCall = calls.find((c) => c[0] && typeof c[0] === 'object' && 'contentType' in c[0]);
      expect(sttCall).toBeDefined();
      expect(sttCall?.[0]).toEqual(
        expect.objectContaining({
          audio: expectedBase64,
          contentType: 'audio/pcm;rate=16000',
        }),
      );
    });

    it('pre-buffer trims to PRE_BUFFER_DEPTH oldest frames', async () => {
      // Send 7 silence frames — pre-buffer should keep only last 5
      for (let i = 0; i < 7; i++) {
        mockVad(false, 0.1);
        await business.processAudio({
          conversationId: 'conv-1',
          audio: new Int16Array([i * 10]),
        });
      }

      // Speech onset — pre-buffer should have frames 2-6 (indices 2,3,4,5,6)
      mockVad(true);
      await business.processAudio({
        conversationId: 'conv-1',
        audio: new Int16Array([70]),
      });

      // Silence → trigger chain
      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({
        conversationId: 'conv-1',
        audio: makeSilenceAudio(),
      });
      await flushMicrotasks();

      // STT audio should be: pre-buffer(5 frames) + speech(1) = [20,30,40,50,60,70]
      const calls = vi.mocked(mediator.send).mock.calls;
      const sttCall = calls.find((c) => c[0] && typeof c[0] === 'object' && 'contentType' in c[0]);
      expect(sttCall).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const sttBase64 = (sttCall?.[0] as unknown as { audio: string }).audio;
      const sttBuffer = Buffer.from(sttBase64, 'base64');
      const sttInt16 = new Int16Array(
        sttBuffer.buffer,
        sttBuffer.byteOffset,
        sttBuffer.byteLength / 2,
      );
      // First value should be 20 (frame index 2), not 0 (frame index 0)
      expect(sttInt16[0]).toBe(20);
    });

    it('uses speakerGender from first processAudio call even if later calls differ', async () => {
      // Frame 1: speech with 'female'
      mockVad(true);
      await business.processAudio({
        conversationId: 'conv-sticky',
        audio: makeSpeechAudio(),
        speakerGender: 'female',
      });

      // Frame 2: speech with 'male' (should be ignored -- state already set)
      mockVad(true);
      await business.processAudio({
        conversationId: 'conv-sticky',
        audio: makeSpeechAudio(),
        speakerGender: 'male',
      });

      // Frame 3: silence -> triggers chain
      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({
        conversationId: 'conv-sticky',
        audio: makeSilenceAudio(),
      });
      await flushMicrotasks();

      const calls = vi.mocked(mediator.send).mock.calls;
      const ttsCall = calls.find(([command]) => hasCommandType(command, 'ai.voice.textToSpeech'));

      expect(ttsCall?.[0]).toEqual(
        expect.objectContaining({
          speakerGender: 'female',
        }),
      );
    });

    it('fills pre-buffer during pipeline processing for next onset capture', async () => {
      // Speech → silence → triggers chain
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSpeechAudio() });

      mockVad(false, 0.1);
      const sttDeferred = createDeferred<{ text: string }>();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      mediator.send.mockReturnValueOnce(sttDeferred.promise as never);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });
      await flushMicrotasks();

      // Send frames while pipeline is processing — should go to pre-buffer
      const midFrame = new Int16Array([99, 88]);
      mockVad(false, 0.05);
      await business.processAudio({ conversationId: 'conv-1', audio: midFrame });

      // Resolve chain to get back to listening
      sttDeferred.resolve({ text: 'test' });
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      mediator.send.mockResolvedValueOnce({ text: 'response' } as never);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      mediator.send.mockResolvedValueOnce({ audio: 'YQ==', contentType: 'audio/wav' } as never);
      await flushMicrotasks();

      // Drain events
      mockVad(false, 0.1);
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });

      // Now speech onset — should include midFrame from pre-buffer
      mockVad(true);
      await business.processAudio({ conversationId: 'conv-1', audio: new Int16Array([77]) });

      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({ conversationId: 'conv-1', audio: makeSilenceAudio() });
      await flushMicrotasks();

      // The STT audio should contain the pre-buffer frame [99,88] captured during processing
      const calls = vi.mocked(mediator.send).mock.calls;
      const sttCalls = calls.filter(
        (c) => c[0] && typeof c[0] === 'object' && 'contentType' in c[0],
      );
      const lastStt = sttCalls[sttCalls.length - 1];
      expect(lastStt).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const sttBase64 = (lastStt?.[0] as unknown as { audio: string }).audio;
      const sttBuffer = Buffer.from(sttBase64, 'base64');
      const sttInt16 = new Int16Array(
        sttBuffer.buffer,
        sttBuffer.byteOffset,
        sttBuffer.byteLength / 2,
      );
      // Should contain 99 from the mid-processing frame
      expect(Array.from(sttInt16)).toContain(99);
    });

    it('emits STT metrics with audio duration when utterance completes', async () => {
      const frame1 = new Int16Array(8000); // 0.5 seconds
      const frame2 = new Int16Array(8000); // 0.5 seconds

      mockVad(true);
      await business.processAudio({
        conversationId: 'conv-metrics',
        audio: frame1,
        metricsContext: { 'ai.operation': 'stt', 'course.id': 'c-1' },
      });

      mockVad(true);
      await business.processAudio({
        conversationId: 'conv-metrics',
        audio: frame2,
        metricsContext: { 'ai.operation': 'stt', 'course.id': 'c-1' },
      });

      mockVad(false, 0.1);
      mockFullChain();
      await business.processAudio({
        conversationId: 'conv-metrics',
        audio: makeSilenceAudio(),
        metricsContext: { 'ai.operation': 'stt', 'course.id': 'c-1' },
      });
      await flushMicrotasks();

      expect(mockAiMetrics.recordSttUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
          userId: 'unknown',
          durationSeconds: expect.closeTo(1.0, 1),
          metricsContext: { 'ai.operation': 'stt', 'course.id': 'c-1' },
        }),
      );
      expect(mockAiMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
          status: 'success',
          metricsContext: { 'ai.operation': 'stt', 'course.id': 'c-1' },
        }),
      );
    });

    it('emits STT error metric when chain errors', async () => {
      mockVad(true);
      await business.processAudio({
        conversationId: 'conv-err',
        audio: makeSpeechAudio(),
      });

      mockVad(false, 0.1);
      vi.mocked(mediator.send).mockRejectedValueOnce(new Error('STT failed'));
      await business.processAudio({
        conversationId: 'conv-err',
        audio: makeSilenceAudio(),
      });
      await flushMicrotasks();

      expect(mockAiMetrics.recordSttUsage).not.toHaveBeenCalled();
      expect(mockAiMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'whisper-1', status: 'error' }),
      );
    });
  });
});

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
