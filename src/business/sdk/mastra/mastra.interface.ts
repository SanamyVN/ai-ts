import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { Agent } from '@mastra/core/agent';
import type { MastraMemory } from '@mastra/core/memory';
import type { PgVector } from '@mastra/pg';

/** Result returned by an agent after generating a response. */
export interface AgentResponse {
  readonly text: string;
  readonly object?: unknown;
  readonly threadId: string;
}

/** A single chunk emitted during a streaming agent response. */
export interface StreamChunk {
  readonly type: 'text-delta' | 'tool-call' | 'finish';
  readonly content: string;
}

/** Options passed to agent generate/stream calls. */
export interface GenerateOptions {
  readonly threadId?: string;
  readonly resourceId?: string;
  readonly outputSchema?: unknown;
}

/** A conversation thread managed by Mastra memory. */
export interface Thread {
  readonly id: string;
  readonly resourceId: string;
  readonly title?: string;
  readonly metadata?: Record<string, unknown>;
}

/** A single message within a conversation thread. */
export interface Message {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly createdAt: Date;
}

/** Pagination parameters for listing messages. */
export interface Pagination {
  readonly page: number;
  readonly perPage: number;
}

/** Paginated list of messages returned from memory. */
export interface MessageList {
  readonly messages: Message[];
  readonly page: number;
  readonly perPage: number;
}

/** Filter criteria for listing threads. */
export interface ThreadFilter {
  readonly resourceId?: string;
}

/** Abstraction over a Mastra AI agent for text generation. */
export interface IMastraAgent {
  /**
   * Generate a complete response from the agent.
   * @param prompt - The user prompt to send.
   * @param options - Optional thread, resource, and output schema settings.
   * @returns The agent's full response including text and thread ID.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  generate(prompt: string, options?: GenerateOptions): Promise<AgentResponse>;

  /**
   * Stream a response from the agent as incremental chunks.
   * @param prompt - The user prompt to send.
   * @param options - Optional thread, resource, and output schema settings.
   * @returns An async iterable of stream chunks.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  stream(prompt: string, options?: GenerateOptions): AsyncIterable<StreamChunk>;
}

/** Abstraction over Mastra memory for thread and message management. */
export interface IMastraMemory {
  /**
   * Create a new conversation thread.
   * @param resourceId - The resource (user/entity) that owns the thread.
   * @returns The newly created thread.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  createThread(resourceId: string): Promise<Thread>;

  /**
   * Retrieve paginated messages from a thread.
   * @param threadId - The thread to read messages from.
   * @param pagination - Page number and page size.
   * @returns A paginated list of messages.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  getMessages(threadId: string, pagination: Pagination): Promise<MessageList>;

  /**
   * List threads, optionally filtered by resource.
   * @param filter - Optional filter criteria.
   * @returns All matching threads.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  listThreads(filter?: ThreadFilter): Promise<Thread[]>;
}

/** DI token for the application-level Mastra agent adapter — bound by the Mastra SDK module. */
export const MASTRA_AGENT = createToken<IMastraAgent>('MASTRA_AGENT');

/** DI token for the application-level Mastra memory adapter — bound by the Mastra SDK module. */
export const MASTRA_MEMORY = createToken<IMastraMemory>('MASTRA_MEMORY');

/** DI token for the raw Mastra core Agent instance — provided by the downstream app. */
export const MASTRA_CORE_AGENT = createToken<Agent>('MASTRA_CORE_AGENT');

/** DI token for the raw Mastra core MastraMemory instance — provided by the downstream app. */
export const MASTRA_CORE_MEMORY = createToken<MastraMemory>('MASTRA_CORE_MEMORY');

/** Abstraction over a Mastra vector store for RAG write-path operations. */
export interface IMastraRag {
  /**
   * Create a vector index if it does not already exist (idempotent).
   * @param indexName - The name of the vector index (typically a scope ID).
   * @param dimension - The embedding dimension (e.g. 1536 for text-embedding-3-small).
   * @throws {MastraAdapterError} When the underlying PgVector call fails.
   */
  createIndex(indexName: string, dimension: number): Promise<void>;

  /**
   * Upsert vectors with metadata into the specified index.
   * @param indexName - The target index name.
   * @param vectors - The embedding vectors to store.
   * @param metadata - Metadata for each vector (must match vectors array length).
   * @returns The number of vectors submitted.
   * @throws {MastraAdapterError} When the underlying PgVector call fails.
   */
  upsert(
    indexName: string,
    vectors: number[][],
    metadata: Record<string, unknown>[],
  ): Promise<number>;

  /**
   * Delete vectors matching the metadata filter from the specified index.
   * @param indexName - The target index name.
   * @param filter - Metadata filter to match vectors for deletion.
   * @returns The number of vectors deleted.
   * @throws {MastraAdapterError} When the underlying PgVector call fails.
   */
  delete(indexName: string, filter: Record<string, unknown>): Promise<number>;
}

/** DI token for the application-level Mastra RAG adapter — bound by the Mastra SDK module. */
export const MASTRA_RAG = createToken<IMastraRag>('MASTRA_RAG');

/** DI token for the raw PgVector instance — provided by the downstream app. */
export const MASTRA_CORE_RAG = createToken<PgVector>('MASTRA_CORE_RAG');
