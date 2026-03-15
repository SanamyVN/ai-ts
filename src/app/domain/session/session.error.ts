import { isSessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import { isSessionAlreadyEndedError } from '@/business/domain/session/session.error.js';

/** Map business/client errors to HTTP-layer errors with status codes. */

export class SessionNotFoundHttpError extends Error {
  readonly statusCode = 404;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export class SessionConflictHttpError extends Error {
  readonly statusCode = 409;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export function mapSessionError(error: unknown): never {
  if (isSessionNotFoundClientError(error)) {
    throw new SessionNotFoundHttpError(error.message, error);
  }
  if (isSessionAlreadyEndedError(error)) {
    throw new SessionConflictHttpError(error.message, error);
  }
  throw error;
}
