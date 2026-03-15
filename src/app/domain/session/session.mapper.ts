import type {
  SessionClientModel,
  SessionSummaryClient,
} from '@/business/domain/session/client/schemas.js';
import type { SessionResponseDto, SessionSummaryResponseDto } from './session.dto.js';

export function toSessionResponseDtoFromClient(model: SessionClientModel): SessionResponseDto {
  return {
    id: model.id,
    mastraThreadId: model.mastraThreadId,
    userId: model.userId,
    tenantId: model.tenantId,
    promptSlug: model.promptSlug,
    purpose: model.purpose,
    status: model.status,
    metadata: model.metadata,
    startedAt: model.startedAt.toISOString(),
    endedAt: model.endedAt !== null ? model.endedAt.toISOString() : null,
  };
}

export function toSessionSummaryResponseDtoFromClient(
  model: SessionSummaryClient,
): SessionSummaryResponseDto {
  return {
    id: model.id,
    userId: model.userId,
    promptSlug: model.promptSlug,
    purpose: model.purpose,
    status: model.status,
    startedAt: model.startedAt.toISOString(),
  };
}
