import { and, desc, eq, gte, ilike, inArray, like, lt } from 'drizzle-orm';
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
   * List sessions ordered `started_at DESC, id DESC` (deterministic across tied
   * timestamps) with offset pagination. (§5)
   */
  async list(
    filter: SessionRepoFilter,
    pagination: { page: number; perPage: number },
  ): Promise<SessionRecord[]> {
    const conditions = this.buildListConditions(filter);
    return this.db.db
      .select()
      .from(aiSessions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiSessions.startedAt), desc(aiSessions.id))
      .limit(pagination.perPage)
      .offset((pagination.page - 1) * pagination.perPage);
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
