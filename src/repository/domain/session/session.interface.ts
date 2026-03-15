import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { SessionRecord, NewSessionRecord } from './session.model.js';

export interface SessionRepoFilter {
  userId?: string;
  tenantId?: string;
  purpose?: string;
  status?: string;
}

export interface ISessionRepository {
  create(data: NewSessionRecord): Promise<SessionRecord>;
  findById(id: string): Promise<SessionRecord | undefined>;
  list(filter: SessionRepoFilter): Promise<SessionRecord[]>;
  updateStatus(id: string, status: string, endedAt?: Date): Promise<SessionRecord>;
}

export const SESSION_REPOSITORY = createToken<ISessionRepository>('SESSION_REPOSITORY');
