import type { MetricsContext } from '@/foundation/ai-metrics/ai-metrics.model.js';

/** Content types matching MDocument factory methods. */
export interface RagContent {
  readonly type: 'text' | 'html' | 'markdown' | 'json';
  readonly data: string;
}

/** Per-document input for batch ingestion. */
export interface DocumentInput {
  readonly documentId: string;
  readonly content: RagContent;
}

/** Chunking options — overrides hardcoded defaults when provided. */
export interface ChunkOptions {
  readonly strategy?:
    | 'recursive'
    | 'character'
    | 'token'
    | 'markdown'
    | 'html'
    | 'json'
    | 'latex'
    | 'sentence'
    | 'semantic-markdown';
  readonly maxSize?: number;
  readonly overlap?: number;
}

/** Input for batch document ingestion into a scope. */
export interface IngestInput {
  readonly indexName: string;
  readonly scopeId: string;
  readonly documents: DocumentInput[];
  readonly chunkOptions?: ChunkOptions;
  readonly metricsContext?: MetricsContext;
}

/** Result of an ingest operation. */
export interface IngestResult {
  readonly chunksStored: number;
}

/** Input for deleting vectors by metadata filter within a scope. */
export interface DeleteInput {
  readonly indexName: string;
  readonly scopeId: string;
  readonly filter: Record<string, unknown>;
}

/** Result of a delete operation. */
export interface DeleteResult {
  readonly chunksDeleted: number;
}

/** Input for replacing a document's vectors with new content. */
export interface ReplaceInput {
  readonly indexName: string;
  readonly scopeId: string;
  readonly documentId: string;
  readonly content: RagContent;
  readonly chunkOptions?: ChunkOptions;
}

/** Result of a replace operation. */
export interface ReplaceResult {
  readonly chunksDeleted: number;
  readonly chunksStored: number;
}

/** Input for semantic search within a scope. */
export interface SearchInput {
  readonly indexName: string;
  readonly scopeId: string;
  readonly queryText: string;
  readonly topK: number;
  readonly documentIds?: string[];
  readonly metricsContext?: MetricsContext;
}

/** A single search result chunk. */
export interface SearchResultItem {
  readonly text: string;
  readonly score: number;
}

/** Result of a semantic search. */
export interface SearchResult {
  readonly results: SearchResultItem[];
}
