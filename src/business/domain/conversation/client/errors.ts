/** Base error for conversation client (mediator) operations. */
export class ConversationClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ConversationNotFoundClientError extends ConversationClientError {
  constructor(
    public readonly conversationId: string,
    cause?: unknown,
  ) {
    super(`Conversation not found: ${conversationId}`, { cause });
  }
}

export function isConversationNotFoundClientError(
  error: unknown,
): error is ConversationNotFoundClientError {
  return error instanceof ConversationNotFoundClientError;
}
