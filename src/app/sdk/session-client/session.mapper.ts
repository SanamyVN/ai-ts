import type { Session, SessionSummary } from '@/business/domain/session/session.model.js';
import type {
  SessionClientModel,
  SessionSummaryClient,
  MessageListClient,
} from '@/business/domain/session/client/schemas.js';
import type { MessageList } from '@/business/sdk/mastra/mastra.interface.js';

/**
 * Converts a business-layer Session to the client model.
 * Used by SessionLocalMediator in monolith mode.
 */
export function toSessionClientModelFromBusiness(session: Session): SessionClientModel {
  return {
    id: session.id,
    mastraThreadId: session.mastraThreadId,
    userId: session.userId,
    tenantId: session.tenantId,
    promptSlug: session.promptSlug,
    resolvedPrompt: session.resolvedPrompt,
    purpose: session.purpose,
    status: session.status,
    metadata: session.metadata,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    lastMessage: session.lastMessage,
    lastMessageAt: session.lastMessageAt,
  };
}

/**
 * Converts a business-layer SessionSummary to the client summary model.
 * Used by SessionLocalMediator in monolith mode.
 */
export function toSessionSummaryClientFromBusiness(summary: SessionSummary): SessionSummaryClient {
  return {
    id: summary.id,
    userId: summary.userId,
    promptSlug: summary.promptSlug,
    purpose: summary.purpose,
    status: summary.status,
    startedAt: summary.startedAt,
    lastMessage: summary.lastMessage,
    lastMessageAt: summary.lastMessageAt,
  };
}

/**
 * Converts a business-layer MessageList to the client message list model.
 */
export function toMessageListClient(messageList: MessageList): MessageListClient {
  return {
    messages: messageList.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    })),
    page: messageList.page,
    perPage: messageList.perPage,
  };
}
