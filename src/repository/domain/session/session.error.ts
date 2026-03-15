/** Base error for session repository operations. */
export class SessionRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class SessionNotFoundRepoError extends SessionRepositoryError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Session not found: ${identifier}`, { cause });
  }
}

export function isSessionNotFoundRepoError(error: unknown): error is SessionNotFoundRepoError {
  return error instanceof SessionNotFoundRepoError;
}
