/** Base error for prompt client (mediator) operations. */
export class PromptClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a prompt cannot be found by ID or slug. */
export class PromptNotFoundClientError extends PromptClientError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt not found: ${identifier}`, { cause });
  }
}

/** Type guard for {@link PromptNotFoundClientError}. */
export function isPromptNotFoundClientError(error: unknown): error is PromptNotFoundClientError {
  return error instanceof PromptNotFoundClientError;
}
