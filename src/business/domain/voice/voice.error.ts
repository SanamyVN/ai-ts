/** Base error for all Voice business layer failures. */
export class VoiceBusinessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a text-to-speech operation fails. */
export class VoiceTtsError extends VoiceBusinessError {
  constructor(message: string, cause?: unknown) {
    super(`Voice TTS failed: ${message}`, { cause });
  }
}

/** Thrown when a speech-to-text operation fails. */
export class VoiceSttError extends VoiceBusinessError {
  constructor(message: string, cause?: unknown) {
    super(`Voice STT failed: ${message}`, { cause });
  }
}

/** Type guard for {@link VoiceTtsError}. */
export function isVoiceTtsError(error: unknown): error is VoiceTtsError {
  return error instanceof VoiceTtsError;
}

/** Type guard for {@link VoiceSttError}. */
export function isVoiceSttError(error: unknown): error is VoiceSttError {
  return error instanceof VoiceSttError;
}
