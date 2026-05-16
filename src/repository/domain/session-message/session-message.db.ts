import { and, eq, gte, inArray, like, lt, sql } from 'drizzle-orm';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { PostgresClient } from '@sanamyvn/foundation/database/postgres';
import type { AiSchema } from '@/shared/schema.js';
import { AI_DB } from '@/shared/tokens.js';
import { aiSessionMessages } from './session-message.schema.js';
import type {
  ISessionMessageRepository,
  SessionMessageRepoFilter,
} from './session-message.interface.js';

@Injectable()
export class SessionMessageDrizzleRepository implements ISessionMessageRepository {
  constructor(@Inject(AI_DB) private readonly db: PostgresClient<AiSchema>) {}

  /**
   * Inserts one event row. Uses `ON CONFLICT (id) DO NOTHING` so callers can
   * safely retry on network errors without double-counting.
   *
   * Both `id` and `sentAt` are caller-supplied. `sentAt` is captured at hook
   * entry in `conversation.business.ts` — not at insert time — so billing
   * periods reflect when the user submitted, not when the DB write landed.
   * The schema's `defaultNow()` is a safety net for non-application callers
   * only (§1 "Data model", §1 "When sent_at is captured").
   */
  async append(input: {
    id: string; // caller-supplied (Node built-in `crypto.randomUUID()`)
    sessionId: string;
    purpose: string;
    sentAt: Date; // caller-supplied — captured at hook entry, not at insert time
  }): Promise<void> {
    await this.db.db
      .insert(aiSessionMessages)
      .values({
        id: input.id,
        sessionId: input.sessionId,
        purpose: input.purpose,
        sentAt: input.sentAt,
      })
      .onConflictDoNothing()
      .execute();
  }

  /**
   * Counts events matching `filter` via `SELECT COUNT(*)::int`.
   * Returns `0` when no rows match (the row is always present — PostgreSQL
   * COUNT always returns a row, but we guard with `?? 0` for safety). (§1, §4)
   */
  async count(filter: SessionMessageRepoFilter): Promise<number> {
    const conditions = this.buildConditions(filter);
    const [row] = await this.db.db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(aiSessionMessages)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return row?.total ?? 0;
  }

  /**
   * Returns per-session event counts for the given session IDs.
   * Sessions with no events are absent from the result map — callers default
   * to `0`. (§1, §5)
   *
   * SQL: SELECT session_id, COUNT(*)::int AS total
   *      FROM ai_session_messages
   *      WHERE session_id = ANY($1)
   *      GROUP BY session_id
   */
  async countBySession(sessionIds: readonly string[]): Promise<Map<string, number>> {
    if (sessionIds.length === 0) {
      return new Map();
    }
    const rows = await this.db.db
      .select({
        sessionId: aiSessionMessages.sessionId,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(aiSessionMessages)
      .where(inArray(aiSessionMessages.sessionId, [...sessionIds]))
      .groupBy(aiSessionMessages.sessionId);
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.sessionId, row.total);
    }
    return map;
  }

  /**
   * Translates a `SessionMessageRepoFilter` into drizzle WHERE-clause
   * conditions. Used by both `count` and future query helpers so predicate
   * logic has one source of truth.
   */
  private buildConditions(filter: SessionMessageRepoFilter) {
    const conditions = [];
    if (filter.purpose) conditions.push(eq(aiSessionMessages.purpose, filter.purpose));
    if (filter.purposePrefix)
      conditions.push(like(aiSessionMessages.purpose, `${filter.purposePrefix}%`));
    if (filter.sentAtGte) conditions.push(gte(aiSessionMessages.sentAt, filter.sentAtGte));
    if (filter.sentAtLt) conditions.push(lt(aiSessionMessages.sentAt, filter.sentAtLt));
    return conditions;
  }
}
