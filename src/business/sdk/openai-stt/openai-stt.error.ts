/** Thrown when an OpenAI-compatible STT SDK operation fails. */
export class OpenAiSttAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`OpenAI STT ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

/** Type guard for {@link OpenAiSttAdapterError}. */
export function isOpenAiSttAdapterError(error: unknown): error is OpenAiSttAdapterError {
  return error instanceof OpenAiSttAdapterError;
}
