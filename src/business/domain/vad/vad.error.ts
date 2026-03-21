export class VadError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export function isVadError(error: unknown): error is VadError {
  return error instanceof VadError;
}
