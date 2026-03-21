/** Thrown when a Kokoro TTS SDK operation fails. */
export class KokoroAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Kokoro TTS ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

/** Type guard for {@link KokoroAdapterError}. */
export function isKokoroAdapterError(error: unknown): error is KokoroAdapterError {
  return error instanceof KokoroAdapterError;
}
