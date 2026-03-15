import { isPromptNotFoundClientError } from '@/business/domain/prompt/client/errors.js';
import { isPromptAlreadyExistsError } from '@/business/domain/prompt/prompt.error.js';

/** Map business/client errors to HTTP-layer errors with status codes. */

export class PromptNotFoundHttpError extends Error {
  readonly statusCode = 404;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export class PromptConflictHttpError extends Error {
  readonly statusCode = 409;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export function mapPromptError(error: unknown): never {
  if (isPromptNotFoundClientError(error)) {
    throw new PromptNotFoundHttpError(error.message, error);
  }
  if (isPromptAlreadyExistsError(error)) {
    throw new PromptConflictHttpError(error.message, error);
  }
  throw error;
}
