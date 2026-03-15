/** Base error for prompt client (mediator) operations. */
export class PromptClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class PromptNotFoundClientError extends PromptClientError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt not found: ${identifier}`, { cause });
  }
}

export function isPromptNotFoundClientError(error: unknown): error is PromptNotFoundClientError {
  return error instanceof PromptNotFoundClientError;
}
