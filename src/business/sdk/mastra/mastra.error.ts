/** Thrown when a Mastra SDK operation (generate, stream, memory) fails. */
export class MastraAdapterError extends Error {
  constructor(
    public readonly operation: string,
    cause?: unknown,
  ) {
    super(`Mastra operation failed: ${operation}`, { cause });
    this.name = new.target.name;
  }
}

/** Type guard for {@link MastraAdapterError}. */
export function isMastraAdapterError(error: unknown): error is MastraAdapterError {
  return error instanceof MastraAdapterError;
}
