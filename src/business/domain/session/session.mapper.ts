import type { SessionRecord } from '@/repository/domain/session/session.model.js';
import type { Session, SessionSummary } from './session.model.js';

export function toSessionFromRecord(record: SessionRecord): Session {
  return {
    id: record.id,
    mastraThreadId: record.mastraThreadId,
    userId: record.userId,
    tenantId: record.tenantId,
    promptSlug: record.promptSlug,
    resolvedPrompt: record.resolvedPrompt,
    purpose: record.purpose,
    status: record.status,
    title: record.title,
    metadata: record.metadata,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    lastMessage: record.lastMessage,
    lastMessageAt: record.lastMessageAt,
  };
}

/**
 * Projects a `SessionRecord` and its precomputed `messageCount` into a
 * `SessionSummary`. The count is computed per page by the business layer via
 * `sessionMessageRepository.countBySession` — it is not a column on
 * `ai_sessions`. (§1)
 *
 * @param record - Raw session record from the repository.
 * @param messageCount - Precomputed count from `countBySession`; defaults to `0`
 *   for sessions absent from the count map.
 */
export function toSessionSummaryFromRecord(
  record: SessionRecord,
  messageCount: number,
): SessionSummary {
  return {
    id: record.id,
    userId: record.userId,
    promptSlug: record.promptSlug,
    purpose: record.purpose,
    status: record.status,
    title: record.title,
    startedAt: record.startedAt,
    lastMessage: record.lastMessage,
    lastMessageAt: record.lastMessageAt,
    messageCount,
  };
}
