import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ZodType } from 'zod';
import type { StreamChunk } from '@/business/sdk/mastra/mastra.interface.js';
import type {
  Conversation,
  ConversationConfig,
  ConversationResponse,
} from './conversation.model.js';

/** Orchestrates AI conversations by creating sessions, sending messages, and streaming responses. */
export interface IConversationEngine {
  /**
   * Creates a new conversation backed by a session and resolved prompt.
   * @param config - Conversation settings including prompt, user, and optional model override.
   * @returns The created conversation handle.
   *
   * @example
   * ```ts
   * const conversation = await engine.create({
   *   promptSlug: 'customer-support',
   *   promptParams: { language: 'en' },
   *   userId: 'user_123',
   *   purpose: 'billing-inquiry',
   *   model: 'gpt-4o',
   * });
   * ```
   */
  create(config: ConversationConfig): Promise<Conversation>;

  /**
   * Sends a message and returns the complete response.
   * @param conversationId - Target conversation ID.
   * @param message - User message text.
   * @returns The AI response containing text and optional structured object.
   * @throws {ConversationNotFoundError} If the conversation does not exist.
   * @throws {ConversationSendError} If the AI backend fails to produce a response.
   */
  /**
   * Sends a message and returns the complete response.
   * @param conversationId - Target conversation ID.
   * @param message - User message text.
   * @param outputSchema - Optional Zod schema for structured output.
   * @returns The AI response containing text and optional structured object.
   * @throws {ConversationNotFoundError} If the conversation does not exist.
   * @throws {ConversationSendError} If the AI backend fails to produce a response.
   *
   * @example
   * ```ts
   * const response = await engine.send(conversation.id, 'Hello');
   * const structured = await engine.send(conversation.id, 'Evaluate', myZodSchema);
   * ```
   */
  send(conversationId: string, message: string, outputSchema?: ZodType): Promise<ConversationResponse>;

  /**
   * Sends a message and returns a streaming response.
   * @param conversationId - Target conversation ID.
   * @param message - User message text.
   * @returns An async iterable of streamed chunks.
   * @throws {ConversationNotFoundError} If the conversation does not exist.
   * @throws {ConversationSendError} If the AI backend fails to produce a response.
   */
  /**
   * Sends a message and returns a streaming response.
   * @param conversationId - Target conversation ID.
   * @param message - User message text.
   * @param outputSchema - Optional Zod schema for structured output.
   * @returns An async iterable of streamed chunks.
   * @throws {ConversationNotFoundError} If the conversation does not exist.
   * @throws {ConversationSendError} If the AI backend fails to produce a response.
   *
   * @example
   * ```ts
   * for await (const chunk of engine.stream(conversation.id, 'Hello', myZodSchema)) {
   *   console.log(chunk.content);
   * }
   * ```
   */
  stream(conversationId: string, message: string, outputSchema?: ZodType): AsyncIterable<StreamChunk>;
}

/** Dependency-injection token for {@link IConversationEngine}. */
export const CONVERSATION_ENGINE = createToken<IConversationEngine>('CONVERSATION_ENGINE');
