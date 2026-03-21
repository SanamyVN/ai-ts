import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { RealTimeVAD } from 'avr-vad';
import {
  VAD_CONFIG,
  type VadConfig,
  type VadFrame,
  type IVad,
} from '@/business/domain/vad/vad.interface.js';
import { SileroAdapterError } from './silero.error.js';

/** Frame duration at 16 kHz with 1536 samples/frame ≈ 96 ms */
const FRAME_DURATION_MS = 96;

const DEFAULT_SPEECH_THRESHOLD = 0.5;
const DEFAULT_SILENCE_THRESHOLD = 0.35;
const DEFAULT_MIN_SPEECH_FRAMES = 3;
const DEFAULT_MIN_SILENCE_DURATION_MS = 550;

/**
 * Wraps `avr-vad`'s `RealTimeVAD` behind the stable `IVad` interface.
 * Implements hysteresis:
 *   - Speech starts when probability > speechThreshold for minSpeechFrames consecutive frames.
 *   - Speech ends when probability < silenceThreshold for minSilenceDurationMs.
 * All errors from avr-vad are caught and re-thrown as `SileroAdapterError`.
 */
@Injectable()
export class SileroVadAdapter implements IVad {
  private readonly speechThreshold: number;
  private readonly silenceThreshold: number;
  private readonly minSpeechFrames: number;
  private readonly minSilenceDurationMs: number;

  /** Lazily initialized; undefined until first processFrame call. */
  private vad: RealTimeVAD | undefined;

  // Hysteresis state
  private isSpeaking = false;
  private consecutiveSpeechFrames = 0;
  private silenceFrameCount = 0;

  constructor(@Inject(VAD_CONFIG) config: VadConfig) {
    this.speechThreshold = config.speechThreshold ?? DEFAULT_SPEECH_THRESHOLD;
    this.silenceThreshold = config.silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD;
    this.minSpeechFrames = config.minSpeechFrames ?? DEFAULT_MIN_SPEECH_FRAMES;
    this.minSilenceDurationMs = config.minSilenceDurationMs ?? DEFAULT_MIN_SILENCE_DURATION_MS;
  }

  /**
   * Processes a single audio frame and returns speech detection result.
   * The audio must be 16-bit PCM (Int16Array) at 16 kHz mono, 1536 samples.
   */
  async processFrame(audio: Int16Array): Promise<VadFrame> {
    try {
      const vad = await this.getVad();
      const probability = await this.extractProbability(vad, audio);
      const isSpeech = this.applyHysteresis(probability);
      return { isSpeech, probability };
    } catch (error) {
      if (error instanceof SileroAdapterError) {
        throw error;
      }
      throw new SileroAdapterError('processFrame', error);
    }
  }

  /** Resets internal hysteresis state (does not destroy the underlying VAD model). */
  reset(): void {
    this.isSpeaking = false;
    this.consecutiveSpeechFrames = 0;
    this.silenceFrameCount = 0;
    if (this.vad) {
      try {
        this.vad.reset();
      } catch (error) {
        throw new SileroAdapterError('reset', error);
      }
    }
  }

  /**
   * Lazily initializes the RealTimeVAD instance on first use.
   * avr-vad loads an ONNX model which requires async initialization.
   */
  private async getVad(): Promise<RealTimeVAD> {
    if (!this.vad) {
      this.vad = await RealTimeVAD.new({
        positiveSpeechThreshold: this.speechThreshold,
        negativeSpeechThreshold: this.silenceThreshold,
        minSpeechFrames: this.minSpeechFrames,
      });
      this.vad.start();
    }
    return this.vad;
  }

  /**
   * Feeds a single Int16Array frame into RealTimeVAD and captures the
   * raw speech probability emitted via the `onFrameProcessed` callback.
   */
  private async extractProbability(vad: RealTimeVAD, audio: Int16Array): Promise<number> {
    // Convert Int16 PCM → normalized Float32 [-1, 1]
    const float32 = new Float32Array(audio.length);
    for (let i = 0; i < audio.length; i++) {
      float32[i] = (audio[i] ?? 0) / 32768;
    }

    let capturedProbability: number | undefined;

    // Temporarily override onFrameProcessed to capture the probability.
    // RealTimeVAD stores options as a private field; we use @ts-expect-error
    // to access it without a type assertion — the field exists at runtime.
    interface FrameProbs {
      isSpeech: number;
      notSpeech: number;
    }
    interface VadWithOptions {
      options?: { onFrameProcessed?: (p: FrameProbs) => void };
    }
    // @ts-expect-error — accessing private RealTimeVAD.options to patch the callback
    const vadWithOptions: VadWithOptions = vad;
    const originalOnFrameProcessed = vadWithOptions.options?.onFrameProcessed;
    if (vadWithOptions.options) {
      vadWithOptions.options.onFrameProcessed = (probs: FrameProbs) => {
        capturedProbability = probs.isSpeech;
        originalOnFrameProcessed?.(probs);
      };
    }

    try {
      await vad.processAudio(float32);
    } finally {
      // Restore original callback
      if (vadWithOptions.options) {
        vadWithOptions.options.onFrameProcessed = originalOnFrameProcessed;
      }
    }

    return capturedProbability ?? 0;
  }

  /**
   * Applies hysteresis logic to determine whether speech is active.
   * - Speech starts after minSpeechFrames consecutive frames above speechThreshold.
   * - Speech ends after silence for minSilenceDurationMs.
   */
  private applyHysteresis(probability: number): boolean {
    if (probability >= this.speechThreshold) {
      this.consecutiveSpeechFrames++;
      this.silenceFrameCount = 0;

      if (!this.isSpeaking && this.consecutiveSpeechFrames >= this.minSpeechFrames) {
        this.isSpeaking = true;
      }
    } else if (probability < this.silenceThreshold) {
      this.consecutiveSpeechFrames = 0;

      if (this.isSpeaking) {
        this.silenceFrameCount++;
        const silenceDurationMs = this.silenceFrameCount * FRAME_DURATION_MS;
        if (silenceDurationMs >= this.minSilenceDurationMs) {
          this.isSpeaking = false;
          this.silenceFrameCount = 0;
        }
      }
    } else {
      // Between thresholds: maintain current speaking state, reset silence counter
      if (this.isSpeaking) {
        this.silenceFrameCount = 0;
      }
    }

    return this.isSpeaking;
  }
}
