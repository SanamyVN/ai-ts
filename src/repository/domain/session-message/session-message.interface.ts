import { createToken } from '@sanamyvn/foundation/di/core/tokens';

/**
 * Filter criteria for querying the `ai_session_messages` event ledger.
 * All fields are optional and combine with AND when multiple are provided.
 * (§1, §4)
 */
export interface SessionMessageRepoFilter {
  /** Exact match on denormalized tenant_id. */
  tenantId?: string;
  /** Exact match on denormalized purpose. Mutually exclusive with `purposePrefix`. */
  purpose?: string;
  /**
   * Case-sensitive prefix match on purpose.
   * Translates to `WHERE purpose LIKE $prefix || '%'`.
   * Mutually exclusive with `purpose`. Cannot be an empty string.
   */
  purposePrefix?: string;
  /**
   * Half-open lower bound: include events where `sent_at >= sentAtGte`.
   * Combine with `sentAtLt` for a billing period `[Gte, Lt)`.
   */
  sentAtGte?: Date;
  /**
   * Half-open upper bound: exclude events where `sent_at >= sentAtLt`.
   * Must be strictly greater than `sentAtGte` when both are provided.
   */
  sentAtLt?: Date;
}

/**
 * Repository for the append-only `ai_session_messages` event ledger.
 *
 * - `append` — writes one event row per successful user message.
 * - `count` — returns the total event count matching a filter (billing aggregate).
 * - `countBySession` — returns per-session counts for a page of session IDs
 *   (used by the session list path to project `messageCount` without a JOIN).
 * (§1, §4)
 */
export interface ISessionMessageRepository {
  /**
   * Insert one event row. Idempotent: duplicate `id` is silently ignored via
   * `INSERT … ON CONFLICT (id) DO NOTHING`. (§1)
   *
   * Both `id` and `sentAt` are caller-supplied — never defaulted by the
   * application path. `id` is generated via `crypto.randomUUID()` at the
   * service layer; `sentAt` is captured at hook entry in
   * `conversation.business.ts` so a long-running stream bills against the
   * period when the user submitted, not when the stream finished.
   * The schema's `defaultNow()` is a safety net for non-application callers
   * only (§1 "Data model", §1 "When sent_at is captured").
   *
   * @param input - Event data. `id` must be a unique ULID/UUID supplied by the caller.
   *   `sentAt` must be captured at hook entry, not at insert time.
   */
  append(input: {
    id: string; // caller-supplied (Node built-in `crypto.randomUUID()`)
    sessionId: string;
    tenantId: string;
    purpose: string;
    sentAt: Date; // caller-supplied — captured at hook entry, not at insert time
  }): Promise<void>;

  /**
   * Count events matching `filter`. Returns `0` when no rows match.
   * Used as the billing aggregate for `CountMessagesByTenantQuery`. (§1, §4)
   *
   * @example
   * // Count all events for a tenant in April 2026
   * await repo.count({
   *   tenantId: 'tenant-abc',
   *   sentAtGte: new Date('2026-04-01T00:00:00.000Z'),
   *   sentAtLt:  new Date('2026-05-01T00:00:00.000Z'),
   * });
   */
  count(filter: SessionMessageRepoFilter): Promise<number>;

  /**
   * Return a map of `sessionId → event count` for the given session IDs.
   * Sessions with no events are absent from the map — callers default to `0`.
   * Used by the session list path to project `messageCount` per page. (§1, §5)
   *
   * @example
   * const map = await repo.countBySession(['id-1', 'id-2']);
   * const count = map.get('id-1') ?? 0;
   */
  countBySession(sessionIds: readonly string[]): Promise<Map<string, number>>;
}

/** Dependency-injection token for {@link ISessionMessageRepository}. */
export const SESSION_MESSAGE_REPOSITORY = createToken<ISessionMessageRepository>(
  'SESSION_MESSAGE_REPOSITORY',
);
