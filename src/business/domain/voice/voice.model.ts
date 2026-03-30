import type { SpeakerGender } from './voice.interface.js';

export interface TextToSpeechInput {
  readonly text: string;
  readonly speakerGender: SpeakerGender;
  readonly options?: Record<string, unknown>;
}

export interface TextToSpeechResult {
  readonly audioStream: NodeJS.ReadableStream;
}

export interface SpeechToTextInput {
  readonly audioStream: NodeJS.ReadableStream;
  readonly options?: Record<string, unknown>;
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
