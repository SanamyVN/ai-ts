import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  IngestInput,
  IngestResult,
  DeleteInput,
  DeleteResult,
  ReplaceInput,
  ReplaceResult,
  SearchInput,
  SearchResult,
} from './rag.model.js';

/** Orchestrates RAG write-path operations: ingest, delete, and replace. */
export interface IRagBusiness {
  /**
   * Ingest a batch of documents: chunk, embed, and store vectors.
   * @param input - Scope, documents, and optional chunk options.
   * @returns The total number of vector chunks stored.
   * @throws {RagIngestError} When the pipeline fails for any document.
   * @throws {RagEmbeddingError} When embedding generation fails.
   */
  ingest(input: IngestInput): Promise<IngestResult>;

  /**
   * Delete vectors matching a metadata filter within a scope.
   * @param input - Scope and metadata filter.
   * @returns The number of chunks deleted.
   * @throws {RagDeleteError} When the vector store delete operation fails.
   */
  delete(input: DeleteInput): Promise<DeleteResult>;

  /**
   * Replace a document's vectors: delete old vectors, then ingest new content.
   * Not transactionally atomic — if ingest fails after delete, old vectors are lost.
   * @param input - Scope, document ID, new content, and optional chunk options.
   * @returns Counts of deleted and stored chunks.
   * @throws {RagIngestError} When the ingest portion fails.
   * @throws {RagDeleteError} When the delete portion fails.
   */
  replace(input: ReplaceInput): Promise<ReplaceResult>;

  /**
   * Semantic search over vectors within a scope.
   * @param input - Index, scope, query text, and result count.
   * @returns Matching chunks ranked by similarity.
   * @throws {RagSearchError} When the search pipeline fails.
   */
  search(input: SearchInput): Promise<SearchResult>;
}

/** Dependency-injection token for {@link IRagBusiness}. */
export const RAG_BUSINESS = createToken<IRagBusiness>('RAG_BUSINESS');
