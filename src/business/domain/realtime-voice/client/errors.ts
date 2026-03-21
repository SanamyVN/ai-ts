/** Base error for RealtimeVoice mediator client failures. */
export class RealtimeVoiceClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Type guard for {@link RealtimeVoiceClientError}. */
export function isRealtimeVoiceClientError(error: unknown): error is RealtimeVoiceClientError {
  return error instanceof RealtimeVoiceClientError;
}
