/** Base error for session repository operations. */
export class SessionRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when an operation targets a session ID that does not exist. */
export class SessionNotFoundRepoError extends SessionRepositoryError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Session not found: ${identifier}`, { cause });
  }
}

/** Type guard for {@link SessionNotFoundRepoError}. */
export function isSessionNotFoundRepoError(error: unknown): error is SessionNotFoundRepoError {
  return error instanceof SessionNotFoundRepoError;
}
