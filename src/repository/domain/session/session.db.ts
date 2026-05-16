import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  like,
  lt,
  sql,
} from 'drizzle-orm';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { PostgresClient } from '@sanamyvn/foundation/database/postgres';
import type { AiSchema } from '@/shared/schema.js';
import { AI_DB } from '@/shared/tokens.js';
import { aiSessions } from './session.schema.js';
import type { ISessionRepository, SessionRepoFilter } from './session.interface.js';
import type { SessionRecord, NewSessionRecord } from './session.model.js';
import { SessionNotFoundRepoError, SessionRepositoryError } from './session.error.js';

@Injectable()
export class SessionDrizzleRepository implements ISessionRepository {
  constructor(@Inject(AI_DB) private readonly db: PostgresClient<AiSchema>) {}

  async create(data: NewSessionRecord): Promise<SessionRecord> {
    const [record] = await this.db.db.insert(aiSessions).values(data).returning();
    if (!record) {
      throw new SessionRepositoryError('Insert returned no rows');
    }
    return record;
  }

  async findById(id: string): Promise<SessionRecord | undefined> {
    const [record] = await this.db.db.select().from(aiSessions).where(eq(aiSessions.id, id));
    return record;
  }

  /**
   * Builds WHERE-clause conditions from `filter`. Used by `list()` so
   * predicate translation has one source of truth. (§2, §3, §5)
   */
  private buildListConditions(filter: SessionRepoFilter) {
    const conditions = [];
    if (filter.userId) conditions.push(eq(aiSessions.userId, filter.userId));
    if (filter.userIds?.length) conditions.push(inArray(aiSessions.userId, filter.userIds));
    if (filter.purpose) conditions.push(eq(aiSessions.purpose, filter.purpose));
    if (filter.purposePrefix) conditions.push(like(aiSessions.purpose, `${filter.purposePrefix}%`));
    if (filter.status) conditions.push(eq(aiSessions.status, filter.status));
    if (filter.search) conditions.push(ilike(aiSessions.title, `%${filter.search}%`));
    if (filter.startedAtGte) conditions.push(gte(aiSessions.startedAt, filter.startedAtGte));
    if (filter.startedAtLt) conditions.push(lt(aiSessions.startedAt, filter.startedAtLt));
    return conditions;
  }

  /**
   * Lists sessions ordered `started_at DESC, id DESC` with offset pagination.
   * Returns both the page rows and the `total` filtered count across all pages.
   *
   * Common path (non-empty page): one query using `COUNT(*) OVER ()` so the
   * count and rows share the same snapshot and filter. Empty-page fallback:
   * a second `SELECT COUNT(*)` with the same WHERE. (§1 SQL plan,
   * design doc paginated-total-counts.md §5.2)
   */
  async list(
    filter: SessionRepoFilter,
    pagination: { page: number; perPage: number },
  ): Promise<{ rows: readonly SessionRecord[]; total: number }> {
    const conditions = this.buildListConditions(filter);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Single query: SELECT *, COUNT(*) OVER () AS total ... LIMIT ... OFFSET ...
    // Drizzle returns the raw column as `total` alongside the typed record fields.
    // getTableColumns() extracts only the column definitions (not the table meta),
    // which is required for spreading into select({}) in Drizzle v0.45.
    const rawRows = await this.db.db
      .select({
        ...getTableColumns(aiSessions),
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(aiSessions)
      .where(whereClause)
      .orderBy(desc(aiSessions.startedAt), desc(aiSessions.id))
      .limit(pagination.perPage)
      .offset((pagination.page - 1) * pagination.perPage);

    if (rawRows.length > 0) {
      // Strip the `total` column off each row before returning typed SessionRecord[].
      // The spread captures all SessionRecord fields; `total` is the only extra column
      // added by the sql`` template tag — this is the type erasure boundary. (§1)
      const firstRow = rawRows[0];
      // firstRow is defined: we are inside `rawRows.length > 0`
      const pageTotal = firstRow ? firstRow.total : 0;
      const rows = rawRows.map(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ({ total: _total, ...record }) => record as unknown as SessionRecord,
      );
      return { rows, total: pageTotal };
    }

    // Empty-page fallback: issue a second SELECT COUNT(*) with the same WHERE
    // to populate total accurately even for past-the-end pages.
    const [countRow] = await this.db.db
      .select({ count: count() })
      .from(aiSessions)
      .where(whereClause)
      .execute();

    return { rows: [], total: countRow?.count ?? 0 };
  }

  async updateStatus(id: string, status: string, endedAt?: Date): Promise<SessionRecord> {
    const [record] = await this.db.db
      .update(aiSessions)
      .set({ status, ...(endedAt !== undefined ? { endedAt } : {}) })
      .where(eq(aiSessions.id, id))
      .returning();
    if (!record) {
      throw new SessionNotFoundRepoError(id);
    }
    return record;
  }

  async updateResolvedPrompt(id: string, resolvedPrompt: string): Promise<SessionRecord> {
    const [record] = await this.db.db
      .update(aiSessions)
      .set({ resolvedPrompt })
      .where(eq(aiSessions.id, id))
      .returning();
    if (!record) {
      throw new SessionNotFoundRepoError(id);
    }
    return record;
  }

  async updateLastMessage(
    id: string,
    lastMessage: string,
    lastMessageAt: Date,
  ): Promise<SessionRecord> {
    const [record] = await this.db.db
      .update(aiSessions)
      .set({ lastMessage, lastMessageAt })
      .where(eq(aiSessions.id, id))
      .returning();
    if (!record) {
      throw new SessionNotFoundRepoError(id);
    }
    return record;
  }

  async updateTitle(id: string, title: string): Promise<SessionRecord> {
    const [record] = await this.db.db
      .update(aiSessions)
      .set({ title })
      .where(eq(aiSessions.id, id))
      .returning();
    if (!record) {
      throw new SessionNotFoundRepoError(id);
    }
    return record;
  }

  async deleteById(id: string): Promise<void> {
    const [record] = await this.db.db.delete(aiSessions).where(eq(aiSessions.id, id)).returning();
    if (!record) {
      throw new SessionNotFoundRepoError(id);
    }
  }
}
