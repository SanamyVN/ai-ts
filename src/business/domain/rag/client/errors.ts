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

/** Thrown when a RAG replace operation fails through the mediator. */
export class RagReplaceClientError extends RagClientError {
  constructor(cause?: unknown) {
    super('RAG replace failed', { cause });
  }
}

export function isRagIngestClientError(error: unknown): error is RagIngestClientError {
  return error instanceof RagIngestClientError;
}

export function isRagDeleteClientError(error: unknown): error is RagDeleteClientError {
  return error instanceof RagDeleteClientError;
}

export function isRagReplaceClientError(error: unknown): error is RagReplaceClientError {
  return error instanceof RagReplaceClientError;
}

/** Thrown when a RAG search operation fails through the mediator. */
export class RagSearchClientError extends RagClientError {
  constructor(cause?: unknown) {
    super('RAG search failed', { cause });
  }
}

export function isRagSearchClientError(error: unknown): error is RagSearchClientError {
  return error instanceof RagSearchClientError;
}
