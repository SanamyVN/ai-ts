import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { Agent } from '@mastra/core/agent';
import type { MastraMemory } from '@mastra/core/memory';
import type { PgVector } from '@mastra/pg';
import type { MastraVoice } from '@mastra/core/voice';
import type { ZodType } from 'zod';

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
  readonly outputSchema?: ZodType;
  readonly instructions?: string;
  readonly toolsets?: Record<string, Record<string, unknown>>;
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
   * @returns The number of vectors deleted. Note: the current PgVector implementation
   *   returns `void`, so this always resolves to `0`. Callers should not rely on the count.
   * @throws {MastraAdapterError} When the underlying PgVector call fails.
   */
  delete(indexName: string, filter: Record<string, unknown>): Promise<number>;

  /**
   * Query the index for vectors similar to the given query vector, filtered by scope.
   * @param indexName - The target index name.
   * @param queryVector - The embedding vector to search with.
   * @param topK - Maximum number of results to return.
   * @param scopeId - Filter results to this scope.
   * @returns Matching chunks ordered by similarity score descending.
   * @throws {MastraAdapterError} When the underlying PgVector call fails.
   */
  search(
    indexName: string,
    queryVector: number[],
    topK: number,
    scopeId: string,
  ): Promise<{ text: string; score: number }[]>;
}

/** DI token for the application-level Mastra RAG adapter — bound by the Mastra SDK module. */
export const MASTRA_RAG = createToken<IMastraRag>('MASTRA_RAG');

/** DI token for the raw PgVector instance — provided by the downstream app. */
export const MASTRA_CORE_RAG = createToken<PgVector>('MASTRA_CORE_RAG');

// ── Voice Types ──

export interface SpeakOptions {
  readonly speaker?: string;
  readonly [key: string]: unknown;
}

export type VoiceSessionOptions = Record<string, unknown>;

export type VoiceEventCallback = (data: unknown) => void;

// ── TTS Interface ──

/** Abstraction over Mastra Voice for text-to-speech operations. */
export interface IMastraVoiceTts {
  /**
   * Convert text to speech.
   * @param input - Text or text stream to convert.
   * @param options - Optional speaker and provider-specific options.
   * @returns Audio stream, or void if the provider emits audio via events.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  textToSpeech(
    input: string | NodeJS.ReadableStream,
    options?: SpeakOptions,
  ): Promise<NodeJS.ReadableStream | undefined>;

  /**
   * List available voices from the provider.
   * @returns Array of available voice IDs and metadata.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  getSpeakers(): Promise<{ voiceId: string; [key: string]: unknown }[]>;
}

// ── STT Interface ──

/** Abstraction over Mastra Voice for speech-to-text operations. */
export interface IMastraVoiceStt {
  /**
   * Convert speech to text.
   * @param audioStream - Audio stream to transcribe.
   * @param options - Provider-specific transcription options.
   * @returns Transcribed text, a text stream, or void if the provider emits text via events.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  speechToText(
    audioStream: NodeJS.ReadableStream,
    options?: Record<string, unknown>,
  ): Promise<string | NodeJS.ReadableStream | undefined>;

  /**
   * Check whether the voice provider supports listening (STT).
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  getListener(): Promise<{ enabled: boolean }>;
}

// ── Realtime Interface ──

/** Abstraction over Mastra Voice for realtime speech-to-speech session management. */
export interface IMastraVoiceRealtime {
  /** Open a realtime voice session (connects to the provider via WebSocket). */
  openSession(options?: VoiceSessionOptions): Promise<void>;
  /** Close the realtime voice session. */
  closeSession(): void;
  /** Stream audio data to the provider for realtime processing. */
  sendAudio(audioData: NodeJS.ReadableStream | Int16Array): Promise<void>;
  /** Send text to the provider (in STS, the provider speaks it via events). */
  sendText(text: string): Promise<void>;
  /** Manually trigger the provider to generate a response (for push-to-talk without VAD). */
  triggerResponse(options?: Record<string, unknown>): Promise<void>;
  /** Register a listener for voice events (speaker, writing, error, etc.). */
  onEvent(event: string, callback: VoiceEventCallback): void;
  /** Remove a voice event listener. */
  offEvent(event: string, callback: VoiceEventCallback): void;
  /** Add tools the provider can invoke during a realtime session. */
  addTools(tools: Record<string, unknown>): void;
  /** Set system instructions for the realtime session. */
  addInstructions(instructions: string): void;
  /** Update provider configuration at runtime. */
  updateConfig(options: Record<string, unknown>): void;
}

// ── Voice DI Tokens ──

/** DI token for the application-level Mastra TTS adapter. */
export const MASTRA_VOICE_TTS = createToken<IMastraVoiceTts>('MASTRA_VOICE_TTS');

/** DI token for the application-level Mastra STT adapter. */
export const MASTRA_VOICE_STT = createToken<IMastraVoiceStt>('MASTRA_VOICE_STT');

/** DI token for the application-level Mastra Realtime adapter. */
export const MASTRA_VOICE_REALTIME = createToken<IMastraVoiceRealtime>('MASTRA_VOICE_REALTIME');

/** DI token for the raw Mastra Voice instance — provided by the downstream app. */
export const MASTRA_CORE_VOICE = createToken<MastraVoice>('MASTRA_CORE_VOICE');
