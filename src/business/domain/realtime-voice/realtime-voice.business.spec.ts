import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockMediator } from '@sanamyvn/foundation/mediator/testing';
import type { MockMediator } from '@sanamyvn/foundation/mediator/testing';
import { RealtimeVoiceBusiness } from './realtime-voice.business.js';

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

describe('RealtimeVoiceBusiness', () => {
  let mediator: MockMediator;
  let business: RealtimeVoiceBusiness;

  beforeEach(() => {
    vi.clearAllMocks();
    mediator = createMockMediator();
    business = new RealtimeVoiceBusiness(mediator);
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
