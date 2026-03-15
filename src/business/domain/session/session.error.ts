/** Base error for session business operations. */
export class SessionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class SessionNotFoundError extends SessionError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Session not found: ${identifier}`, { cause });
  }
}

export class SessionAlreadyEndedError extends SessionError {
  constructor(
    public readonly sessionId: string,
    cause?: unknown,
  ) {
    super(`Session already ended: ${sessionId}`, { cause });
  }
}

export function isSessionNotFoundError(error: unknown): error is SessionNotFoundError {
  return error instanceof SessionNotFoundError;
}

export function isSessionAlreadyEndedError(error: unknown): error is SessionAlreadyEndedError {
  return error instanceof SessionAlreadyEndedError;
}
