/** Thrown when a Speaches TTS SDK operation fails. */
export class SpeachesTtsAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Speaches TTS ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

/** Type guard for {@link SpeachesTtsAdapterError}. */
export function isSpeachesTtsAdapterError(error: unknown): error is SpeachesTtsAdapterError {
  return error instanceof SpeachesTtsAdapterError;
}
