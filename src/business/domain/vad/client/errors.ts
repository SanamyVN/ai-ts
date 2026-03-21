/** Base error for VAD mediator client failures. */
export class VadClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Type guard for {@link VadClientError}. */
export function isVadClientError(error: unknown): error is VadClientError {
  return error instanceof VadClientError;
}
