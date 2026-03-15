import type {
  Conversation,
  ConversationResponse,
} from '@/business/domain/conversation/conversation.model.js';
import type {
  ConversationClient,
  ConversationResponseClient,
} from '@/business/domain/conversation/client/schemas.js';

/**
 * Converts a business-layer Conversation to the client model.
 * Used by ConversationLocalMediator in monolith mode.
 */
export function toConversationClientFromBusiness(conversation: Conversation): ConversationClient {
  return {
    id: conversation.id,
    sessionId: conversation.sessionId,
    promptSlug: conversation.promptSlug,
    resolvedPrompt: conversation.resolvedPrompt,
    model: conversation.model,
  };
}

/**
 * Converts a business-layer ConversationResponse to the client response model.
 * Used by ConversationLocalMediator in monolith mode.
 */
export function toConversationResponseClientFromBusiness(
  response: ConversationResponse,
): ConversationResponseClient {
  return {
    text: response.text,
    object: response.object,
  };
}
