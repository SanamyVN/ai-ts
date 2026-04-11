import type { SpeakerGender } from './voice.interface.js';
import type { MetricsContext } from '@/foundation/ai-metrics/ai-metrics.model.js';

export interface TextToSpeechInput {
  readonly text: string;
  readonly speakerGender: SpeakerGender;
  readonly options?: Record<string, unknown>;
  readonly metricsContext?: MetricsContext;
}

export interface TextToSpeechResult {
  readonly audioStream: NodeJS.ReadableStream;
}

export interface SpeechToTextInput {
  readonly audioStream: NodeJS.ReadableStream;
  readonly options?: Record<string, unknown>;
  readonly metricsContext?: MetricsContext;
}

export interface SpeechToTextResult {
  readonly text: string;
}

export interface Speaker {
  readonly voiceId: string;
  readonly [key: string]: unknown;
}

export interface GetSpeakersResult {
  readonly speakers: Speaker[];
}
