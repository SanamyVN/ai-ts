/** Thrown when a Silero VAD SDK operation fails. */
export class SileroAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Silero VAD ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

/** Type guard for {@link SileroAdapterError}. */
export function isSileroAdapterError(error: unknown): error is SileroAdapterError {
  return error instanceof SileroAdapterError;
}
