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
    metadata: record.metadata,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
  };
}

export function toSessionSummaryFromRecord(record: SessionRecord): SessionSummary {
  return {
    id: record.id,
    userId: record.userId,
    promptSlug: record.promptSlug,
    purpose: record.purpose,
    status: record.status,
    startedAt: record.startedAt,
  };
}
