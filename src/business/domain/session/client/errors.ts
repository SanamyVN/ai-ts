/** Base error for session client (mediator) operations. */
export class SessionClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class SessionNotFoundClientError extends SessionClientError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Session not found: ${identifier}`, { cause });
  }
}

export function isSessionNotFoundClientError(error: unknown): error is SessionNotFoundClientError {
  return error instanceof SessionNotFoundClientError;
}
