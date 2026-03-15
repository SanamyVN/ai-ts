/** Base error for prompt version repository operations. */
export class PromptVersionRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class PromptVersionNotFoundRepoError extends PromptVersionRepositoryError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt version not found: ${identifier}`, { cause });
  }
}

export function isPromptVersionNotFoundRepoError(
  error: unknown,
): error is PromptVersionNotFoundRepoError {
  return error instanceof PromptVersionNotFoundRepoError;
}
