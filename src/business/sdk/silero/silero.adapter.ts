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

  /** Latest probability captured from the onFrameProcessed callback. */
  private lastProbability = 0;

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
      await this.feedAudio(vad, audio);
      const probability = this.lastProbability;
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
    this.lastProbability = 0;
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
   * The `onFrameProcessed` callback captures the speech probability
   * into `this.lastProbability` on every frame.
   */
  private async getVad(): Promise<RealTimeVAD> {
    if (!this.vad) {
      this.vad = await RealTimeVAD.new({
        positiveSpeechThreshold: this.speechThreshold,
        negativeSpeechThreshold: this.silenceThreshold,
        minSpeechFrames: this.minSpeechFrames,
        onFrameProcessed: (probs) => {
          this.lastProbability = probs.isSpeech;
        },
      });
      this.vad.start();
    }
    return this.vad;
  }

  /** Converts Int16 PCM to normalized Float32 and feeds it to the VAD. */
  private async feedAudio(vad: RealTimeVAD, audio: Int16Array): Promise<void> {
    const float32 = new Float32Array(audio.length);
    for (let i = 0; i < audio.length; i++) {
      float32[i] = (audio[i] ?? 0) / 32768;
    }
    await vad.processAudio(float32);
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
