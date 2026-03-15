import type { ConversationClient } from '@/business/domain/conversation/client/schemas.js';
import type { ConversationResponseDto } from './conversation.dto.js';

export function toConversationResponseDtoFromClient(
  model: ConversationClient,
): ConversationResponseDto {
  return {
    id: model.id,
    sessionId: model.sessionId,
    promptSlug: model.promptSlug,
    model: model.model,
    resolvedPrompt: model.resolvedPrompt,
  };
}
