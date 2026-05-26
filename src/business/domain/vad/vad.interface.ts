import { createToken, type IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { DetectSpeechInput, VadResult } from './vad.model.js';

export interface VadConfig {
  readonly speechThreshold?: number;
  readonly silenceThreshold?: number;
  readonly minSpeechFrames?: number;
  readonly minSilenceDurationMs?: number;
}

export interface VadFrame {
  readonly isSpeech: boolean;
  readonly probability: number;
}

export interface IVad {
  processFrame(audio: Int16Array): Promise<VadFrame>;
  reset(): void;
}

export interface IVadBusiness {
  detectSpeech(input: DetectSpeechInput): Promise<VadResult>;
  resetSession(): void;
}

export const VAD: IToken<IVad> = createToken<IVad>('VAD');
export const VAD_CONFIG: IToken<VadConfig> = createToken<VadConfig>('VAD_CONFIG');
export const VAD_BUSINESS: IToken<IVadBusiness> = createToken<IVadBusiness>('VAD_BUSINESS');
