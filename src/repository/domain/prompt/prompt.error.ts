/** Base error for prompt repository operations. */
export class PromptRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when creating a prompt whose slug already exists. */
export class DuplicatePromptError extends PromptRepositoryError {
  constructor(
    public readonly slug: string,
    cause?: unknown,
  ) {
    super(`Prompt with slug "${slug}" already exists`, { cause });
  }
}

/** Thrown when an operation targets a prompt ID that does not exist. */
export class PromptNotFoundRepoError extends PromptRepositoryError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt not found: ${identifier}`, { cause });
  }
}

/** Type guard for {@link DuplicatePromptError}. */
export function isDuplicatePromptError(error: unknown): error is DuplicatePromptError {
  return error instanceof DuplicatePromptError;
}

/** Type guard for {@link PromptNotFoundRepoError}. */
export function isPromptNotFoundRepoError(error: unknown): error is PromptNotFoundRepoError {
  return error instanceof PromptNotFoundRepoError;
}
