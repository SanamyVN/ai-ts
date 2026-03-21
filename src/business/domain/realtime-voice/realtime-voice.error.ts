/** Base error for all realtime voice pipeline failures. */
export class RealtimeVoiceError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

/** Type guard for {@link RealtimeVoiceError}. */
export function isRealtimeVoiceError(error: unknown): error is RealtimeVoiceError {
  return error instanceof RealtimeVoiceError;
}
