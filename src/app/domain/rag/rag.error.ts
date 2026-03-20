import {
  isRagIngestError,
  isRagDeleteError,
  isRagEmbeddingError,
  isRagSearchError,
} from '@/business/domain/rag/rag.error.js';
import {
  isRagIngestClientError,
  isRagDeleteClientError,
  isRagSearchClientError,
} from '@/business/domain/rag/client/errors.js';

export class RagHttpIngestError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export class RagHttpDeleteError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export class RagHttpSearchError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export function mapRagError(error: unknown): never {
  if (isRagIngestError(error) || isRagIngestClientError(error)) {
    throw new RagHttpIngestError(error.message, error);
  }
  if (isRagEmbeddingError(error)) {
    throw new RagHttpIngestError(error.message, error);
  }
  if (isRagDeleteError(error) || isRagDeleteClientError(error)) {
    throw new RagHttpDeleteError(error.message, error);
  }
  if (isRagSearchError(error) || isRagSearchClientError(error)) {
    throw new RagHttpSearchError(error.message, error);
  }
  throw error;
}
