import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { SessionRecord, NewSessionRecord } from './session.model.js';

/** Criteria for filtering sessions in list queries. All fields are optional. */
export interface SessionRepoFilter {
  userId?: string;
  tenantId?: string;
  purpose?: string;
  status?: string;
}

/** Manages persistence and retrieval of AI conversation sessions. */
export interface ISessionRepository {
  /**
   * Persist a new session.
   * @param data - Fields for the new session record.
   * @returns The created session record.
   */
  create(data: NewSessionRecord): Promise<SessionRecord>;

  /**
   * Look up a session by its unique ID.
   * @param id - Primary-key identifier.
   * @returns The matching record, or `undefined` if not found.
   */
  findById(id: string): Promise<SessionRecord | undefined>;

  /**
   * List sessions matching the provided filter criteria.
   * @param filter - Filter options (user, tenant, purpose, status).
   * @returns Array of matching session records.
   */
  list(filter: SessionRepoFilter): Promise<SessionRecord[]>;

  /**
   * Transition a session to a new status.
   * @param id - ID of the session to update.
   * @param status - New status value.
   * @param endedAt - Optional timestamp marking when the session ended.
   * @returns The updated session record.
   * @throws {SessionNotFoundRepoError} When no session exists with the given ID.
   */
  updateStatus(id: string, status: string, endedAt?: Date): Promise<SessionRecord>;
}

/** Dependency-injection token for {@link ISessionRepository}. */
export const SESSION_REPOSITORY = createToken<ISessionRepository>('SESSION_REPOSITORY');
