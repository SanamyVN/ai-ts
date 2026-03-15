import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { StreamChunk } from '@/business/sdk/mastra/mastra.interface.js';
import type { Conversation, ConversationConfig, ConversationResponse } from './conversation.model.js';

export interface IConversationEngine {
  create(config: ConversationConfig): Promise<Conversation>;
  send(conversationId: string, message: string): Promise<ConversationResponse>;
  stream(conversationId: string, message: string): AsyncIterable<StreamChunk>;
}

export const CONVERSATION_ENGINE = createToken<IConversationEngine>('CONVERSATION_ENGINE');
