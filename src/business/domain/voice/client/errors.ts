/** Base error for Voice mediator client failures. */
export class VoiceClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a TTS mediator operation fails. */
export class VoiceClientTtsError extends VoiceClientError {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

/** Thrown when an STT mediator operation fails. */
export class VoiceClientSttError extends VoiceClientError {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

/** Type guard for {@link VoiceClientError}. */
export function isVoiceClientError(error: unknown): error is VoiceClientError {
  return error instanceof VoiceClientError;
}

/** Type guard for {@link VoiceClientTtsError}. */
export function isVoiceClientTtsError(error: unknown): error is VoiceClientTtsError {
  return error instanceof VoiceClientTtsError;
}

/** Type guard for {@link VoiceClientSttError}. */
export function isVoiceClientSttError(error: unknown): error is VoiceClientSttError {
  return error instanceof VoiceClientSttError;
}
