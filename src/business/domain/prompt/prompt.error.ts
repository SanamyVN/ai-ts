/** Base error for prompt business operations. */
export class PromptError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a prompt template or slug cannot be found. */
export class PromptNotFoundError extends PromptError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt not found: ${identifier}`, { cause });
  }
}

/** Thrown when creating a prompt with a slug that is already taken. */
export class PromptAlreadyExistsError extends PromptError {
  constructor(
    public readonly slug: string,
    cause?: unknown,
  ) {
    super(`Prompt already exists: ${slug}`, { cause });
  }
}

/** Thrown when a prompt version ID does not exist. */
export class PromptVersionNotFoundError extends PromptError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt version not found: ${identifier}`, { cause });
  }
}

/** Thrown when the supplied parameters do not satisfy the prompt's parameter schema. */
export class InvalidPromptParametersError extends PromptError {
  constructor(
    public readonly slug: string,
    public readonly details: string,
    cause?: unknown,
  ) {
    super(`Invalid parameters for prompt "${slug}": ${details}`, { cause });
  }
}

/** Thrown when Mustache rendering of the prompt template fails. */
export class PromptRenderError extends PromptError {
  constructor(
    public readonly slug: string,
    cause?: unknown,
  ) {
    super(`Failed to render prompt template "${slug}"`, { cause });
  }
}

export function isPromptNotFoundError(error: unknown): error is PromptNotFoundError {
  return error instanceof PromptNotFoundError;
}

export function isPromptAlreadyExistsError(error: unknown): error is PromptAlreadyExistsError {
  return error instanceof PromptAlreadyExistsError;
}
