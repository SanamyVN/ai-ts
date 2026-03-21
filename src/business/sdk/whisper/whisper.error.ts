/** Thrown when a Whisper STT SDK operation fails. */
export class WhisperAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Whisper STT ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

/** Type guard for {@link WhisperAdapterError}. */
export function isWhisperAdapterError(error: unknown): error is WhisperAdapterError {
  return error instanceof WhisperAdapterError;
}
