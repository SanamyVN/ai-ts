import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { aiSessions } from './session.schema.js';
import type { ISessionRepository, SessionRepoFilter } from './session.interface.js';
import type { SessionRecord, NewSessionRecord } from './session.model.js';
import { SessionNotFoundRepoError, SessionRepositoryError } from './session.error.js';

export class SessionDrizzleRepository implements ISessionRepository {
  constructor(private readonly db: NodePgDatabase<Record<string, unknown>>) {}

  async create(data: NewSessionRecord): Promise<SessionRecord> {
    const [record] = await this.db.insert(aiSessions).values(data).returning();
    if (!record) {
      throw new SessionRepositoryError('Insert returned no rows');
    }
    return record;
  }

  async findById(id: string): Promise<SessionRecord | undefined> {
    const [record] = await this.db.select().from(aiSessions).where(eq(aiSessions.id, id));
    return record;
  }

  async list(filter: SessionRepoFilter): Promise<SessionRecord[]> {
    const conditions = [];
    if (filter.userId) conditions.push(eq(aiSessions.userId, filter.userId));
    if (filter.tenantId) conditions.push(eq(aiSessions.tenantId, filter.tenantId));
    if (filter.purpose) conditions.push(eq(aiSessions.purpose, filter.purpose));
    if (filter.status) conditions.push(eq(aiSessions.status, filter.status));

    const query = this.db.select().from(aiSessions);
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    return query;
  }

  async updateStatus(id: string, status: string, endedAt?: Date): Promise<SessionRecord> {
    const [record] = await this.db
      .update(aiSessions)
      .set({ status, ...(endedAt !== undefined ? { endedAt } : {}) })
      .where(eq(aiSessions.id, id))
      .returning();
    if (!record) {
      throw new SessionNotFoundRepoError(id);
    }
    return record;
  }
}
