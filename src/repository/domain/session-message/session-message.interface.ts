import { createToken, type IToken } from '@sanamyvn/foundation/di/core/tokens';

/**
 * Filter shape shared by `count` and the internal use sites that translate
 * domain `CountMessagesFilter` into the repo type. (§1, §4)
 *
 * Tenant isolation is handled by the active Postgres `search_path` on the
 * injected `AI_DB` connection. No tenant field is needed here. (v1.27)
 */
export interface SessionMessageRepoFilter {
  /** Exact-match `purpose`. */
  purpose?: string;
  /** Prefix-match `purpose` (case-sensitive). */
  purposePrefix?: string;
  /** Lower bound (inclusive) on `sent_at`. */
  sentAtGte?: Date;
  /** Upper bound (exclusive) on `sent_at`. */
  sentAtLt?: Date;
}

/**
 * Append-only ledger of successful user-submitted messages, used to source
 * `SessionSummary.messageCount` (per page via `countBySession`) and the
 * `CountMessagesQuery` aggregate (via `count`). (§1, §4)
 */
export interface ISessionMessageRepository {
  /**
   * Inserts one ledger row. Idempotent on `id` (ON CONFLICT DO NOTHING).
   * `purpose` is denormalized at insert time. (§1)
   *
   * @param input - Event data. `id` must be a unique ULID/UUID supplied by the caller.
   *   `sentAt` must be captured at hook entry, not at insert time.
   */
  append(input: { id: string; sessionId: string; purpose: string; sentAt: Date }): Promise<void>;

  /**
   * `COUNT(*)` over the ledger filtered by `filter`. Returns 0 on empty match.
   * Used as the billing aggregate for `CountMessagesQuery`. (§1, §4)
   */
  count(filter: SessionMessageRepoFilter): Promise<number>;

  /**
   * Per-session counts for the given session ids. Sessions with no events
   * are absent from the returned map; callers default to 0.
   * Used by the session list path to project `messageCount` per page. (§1, §5)
   */
  countBySession(sessionIds: readonly string[]): Promise<Map<string, number>>;
}

/** Dependency-injection token for {@link ISessionMessageRepository}. */
export const SESSION_MESSAGE_REPOSITORY: IToken<ISessionMessageRepository> = createToken<ISessionMessageRepository>(
  'SESSION_MESSAGE_REPOSITORY',
);
