/** Base error for conversation client (mediator) operations. */
export class ConversationClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a conversation cannot be found by ID. */
export class ConversationNotFoundClientError extends ConversationClientError {
  constructor(
    public readonly conversationId: string,
    cause?: unknown,
  ) {
    super(`Conversation not found: ${conversationId}`, { cause });
  }
}

/** Type guard for {@link ConversationNotFoundClientError}. */
export function isConversationNotFoundClientError(
  error: unknown,
): error is ConversationNotFoundClientError {
  return error instanceof ConversationNotFoundClientError;
}
