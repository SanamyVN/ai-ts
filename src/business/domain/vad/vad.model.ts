export interface DetectSpeechInput {
  readonly audio: Int16Array;
}

export interface VadResult {
  readonly isSpeech: boolean;
  readonly probability: number;
}
