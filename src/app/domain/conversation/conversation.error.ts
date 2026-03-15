import { isConversationNotFoundClientError } from '@/business/domain/conversation/client/errors.js';
import { isConversationSendError } from '@/business/domain/conversation/conversation.error.js';

/** Map business/client errors to HTTP-layer errors with status codes. */

export class ConversationNotFoundHttpError extends Error {
  readonly statusCode = 404;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export class ConversationInternalHttpError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export function mapConversationError(error: unknown): never {
  if (isConversationNotFoundClientError(error)) {
    throw new ConversationNotFoundHttpError(error.message, error);
  }
  if (isConversationSendError(error)) {
    throw new ConversationInternalHttpError(error.message, error);
  }
  throw error;
}
