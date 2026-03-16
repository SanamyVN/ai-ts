/** Base error for session client (mediator) operations. */
export class SessionClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a session cannot be found by ID. */
export class SessionNotFoundClientError extends SessionClientError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Session not found: ${identifier}`, { cause });
  }
}

/** Type guard for {@link SessionNotFoundClientError}. */
export function isSessionNotFoundClientError(error: unknown): error is SessionNotFoundClientError {
  return error instanceof SessionNotFoundClientError;
}
