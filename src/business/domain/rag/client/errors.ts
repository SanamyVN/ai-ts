/** Base error for RAG client (mediator) operations. */
export class RagClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a RAG ingest operation fails through the mediator. */
export class RagIngestClientError extends RagClientError {
  constructor(cause?: unknown) {
    super('RAG ingest failed', { cause });
  }
}

/** Thrown when a RAG delete operation fails through the mediator. */
export class RagDeleteClientError extends RagClientError {
  constructor(cause?: unknown) {
    super('RAG delete failed', { cause });
  }
}

export function isRagIngestClientError(error: unknown): error is RagIngestClientError {
  return error instanceof RagIngestClientError;
}

export function isRagDeleteClientError(error: unknown): error is RagDeleteClientError {
  return error instanceof RagDeleteClientError;
}
