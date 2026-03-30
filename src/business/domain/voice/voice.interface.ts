import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  TextToSpeechInput,
  TextToSpeechResult,
  SpeechToTextInput,
  SpeechToTextResult,
  GetSpeakersResult,
} from './voice.model.js';

export type SpeakerGender = 'male' | 'female';

export interface VoiceTtsConfig {
  readonly male: string;
  readonly female: string;
  readonly defaultSpeakerGender: SpeakerGender;
}

export const VOICE_TTS_CONFIG = createToken<VoiceTtsConfig>('VOICE_TTS_CONFIG');

/** Abstraction over voice operations for text-to-speech and speech-to-text. */
export interface IVoiceBusiness {
  /** Convert text to an audio stream. */
  textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechResult>;
  /** Convert an audio stream to text. */
  speechToText(input: SpeechToTextInput): Promise<SpeechToTextResult>;
  /** List available voice speakers. */
  getSpeakers(): Promise<GetSpeakersResult>;
}

/** DI token for the Voice business service. */
export const VOICE_BUSINESS = createToken<IVoiceBusiness>('VOICE_BUSINESS');
