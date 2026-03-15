/** Base error for prompt repository operations. */
export class PromptRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class DuplicatePromptError extends PromptRepositoryError {
  constructor(
    public readonly slug: string,
    cause?: unknown,
  ) {
    super(`Prompt with slug "${slug}" already exists`, { cause });
  }
}

export class PromptNotFoundRepoError extends PromptRepositoryError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt not found: ${identifier}`, { cause });
  }
}

export function isDuplicatePromptError(error: unknown): error is DuplicatePromptError {
  return error instanceof DuplicatePromptError;
}

export function isPromptNotFoundRepoError(error: unknown): error is PromptNotFoundRepoError {
  return error instanceof PromptNotFoundRepoError;
}
