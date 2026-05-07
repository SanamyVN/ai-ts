import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { SessionRecord, NewSessionRecord } from './session.model.js';

/** Criteria for filtering sessions in list queries. All fields are optional. */
export interface SessionRepoFilter {
  userId?: string;
  userIds?: string[];
  tenantId?: string;
  purpose?: string;
  /**
   * Case-sensitive prefix match against the session purpose.
   * Translates to `WHERE purpose LIKE $prefix || '%'`.
   * Cannot be an empty string. Mutually exclusive with `purpose`. (§3)
   */
  purposePrefix?: string;
  status?: string;
  /** Case-insensitive substring match against the session title. */
  search?: string;
  /**
   * Half-open lower bound: include sessions where `started_at >= startedAtGte`.
   * Combine with `startedAtLt` for a billing-period window `[Gte, Lt)`. (§2)
   */
  startedAtGte?: Date;
  /**
   * Half-open upper bound: exclude sessions where `started_at >= startedAtLt`.
   * Must be strictly greater than `startedAtGte` when both are provided. (§2)
   */
  startedAtLt?: Date;
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
   * List sessions matching the provided filter, newest first.
   * Ordered `started_at DESC, id DESC` for deterministic pagination across
   * pages with tied `started_at` values. (§5)
   *
   * @param filter - Filter options.
   * @param pagination - 1-based `page` and `perPage` (max 500). Required — no
   *   unbounded fetch path exists.
   * @returns One page of matching session records.
   */
  list(
    filter: SessionRepoFilter,
    pagination: { page: number; perPage: number },
  ): Promise<SessionRecord[]>;

  /**
   * Transition a session to a new status.
   * @param id - ID of the session to update.
   * @param status - New status value.
   * @param endedAt - Optional timestamp marking when the session ended.
   * @returns The updated session record.
   * @throws {SessionNotFoundRepoError} When no session exists with the given ID.
   */
  updateStatus(id: string, status: string, endedAt?: Date): Promise<SessionRecord>;

  /**
   * Update the resolved prompt for a session.
   * @param id - Session ID.
   * @param resolvedPrompt - The new resolved prompt text.
   * @returns The updated session record.
   * @throws {SessionNotFoundRepoError} When no session exists with the given ID.
   */
  updateResolvedPrompt(id: string, resolvedPrompt: string): Promise<SessionRecord>;

  /**
   * Update the last message and its timestamp for a session.
   * @param id - Session ID.
   * @param lastMessage - The most recent message text.
   * @param lastMessageAt - The timestamp of the most recent message.
   * @returns The updated session record.
   * @throws {SessionNotFoundRepoError} When no session exists with the given ID.
   */
  updateLastMessage(id: string, lastMessage: string, lastMessageAt: Date): Promise<SessionRecord>;

  /**
   * Update the session title.
   * @param id - Session ID.
   * @param title - The new title text.
   * @returns The updated session record.
   * @throws {SessionNotFoundRepoError} When no session exists with the given ID.
   */
  updateTitle(id: string, title: string): Promise<SessionRecord>;

  /**
   * Delete a session by its unique ID.
   * @param id - Session ID.
   * @throws {SessionNotFoundRepoError} When no session exists with the given ID.
   */
  deleteById(id: string): Promise<void>;
}

/** Dependency-injection token for {@link ISessionRepository}. */
export const SESSION_REPOSITORY = createToken<ISessionRepository>('SESSION_REPOSITORY');
