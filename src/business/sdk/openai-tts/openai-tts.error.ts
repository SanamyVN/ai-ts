/** Thrown when an OpenAI-compatible TTS SDK operation fails. */
export class OpenAiTtsAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`OpenAI TTS ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

/** Type guard for {@link OpenAiTtsAdapterError}. */
export function isOpenAiTtsAdapterError(error: unknown): error is OpenAiTtsAdapterError {
  return error instanceof OpenAiTtsAdapterError;
}
