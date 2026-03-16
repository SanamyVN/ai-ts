/** Base error for conversation business operations. */
export class ConversationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a conversation ID cannot be found. */
export class ConversationNotFoundError extends ConversationError {
  constructor(
    public readonly conversationId: string,
    cause?: unknown,
  ) {
    super(`Conversation not found: ${conversationId}`, { cause });
  }
}

/** Thrown when sending a message to the AI backend fails. */
export class ConversationSendError extends ConversationError {
  constructor(
    public readonly conversationId: string,
    cause?: unknown,
  ) {
    super(`Failed to send message in conversation: ${conversationId}`, { cause });
  }
}

export function isConversationNotFoundError(error: unknown): error is ConversationNotFoundError {
  return error instanceof ConversationNotFoundError;
}

export function isConversationSendError(error: unknown): error is ConversationSendError {
  return error instanceof ConversationSendError;
}
