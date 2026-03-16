/** Base error for RAG business operations. */
export class RagBusinessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when the RAG ingest pipeline fails (chunking, embedding, or vector upsert). */
export class RagIngestError extends RagBusinessError {
  constructor(
    public readonly documentId: string,
    cause?: unknown,
  ) {
    super(`RAG ingestion failed for document: ${documentId}`, { cause });
  }
}

/** Thrown when deleting vectors from the store fails. */
export class RagDeleteError extends RagBusinessError {
  constructor(
    public readonly scopeId: string,
    cause?: unknown,
  ) {
    super(`RAG vector deletion failed in scope: ${scopeId}`, { cause });
  }
}

/** Thrown when embedding generation fails. */
export class RagEmbeddingError extends RagBusinessError {
  constructor(cause?: unknown) {
    super('Embedding generation failed', { cause });
  }
}

export function isRagIngestError(error: unknown): error is RagIngestError {
  return error instanceof RagIngestError;
}

export function isRagDeleteError(error: unknown): error is RagDeleteError {
  return error instanceof RagDeleteError;
}

/** Thrown when an unsupported content type is encountered. */
export class RagContentProcessingError extends RagBusinessError {
  constructor(
    public readonly contentType: string,
    cause?: unknown,
  ) {
    super(`Unsupported RAG content type: ${contentType}`, { cause });
  }
}

export function isRagEmbeddingError(error: unknown): error is RagEmbeddingError {
  return error instanceof RagEmbeddingError;
}

export function isRagContentProcessingError(error: unknown): error is RagContentProcessingError {
  return error instanceof RagContentProcessingError;
}
