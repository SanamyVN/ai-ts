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
  readonly scopeId: string;
  readonly documents: DocumentInput[];
  readonly chunkOptions?: ChunkOptions;
}

/** Result of an ingest operation. */
export interface IngestResult {
  readonly chunksStored: number;
}

/** Input for deleting vectors by metadata filter within a scope. */
export interface DeleteInput {
  readonly scopeId: string;
  readonly filter: Record<string, unknown>;
}

/** Result of a delete operation. */
export interface DeleteResult {
  readonly chunksDeleted: number;
}

/** Input for replacing a document's vectors with new content. */
export interface ReplaceInput {
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
