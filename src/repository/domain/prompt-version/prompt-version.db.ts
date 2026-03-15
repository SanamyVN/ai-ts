import { sql, eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { aiPromptVersions } from './prompt-version.schema.js';
import type { IPromptVersionRepository } from './prompt-version.interface.js';
import type { PromptVersionRecord, NewPromptVersionRecord } from './prompt-version.model.js';
import {
  PromptVersionNotFoundRepoError,
  PromptVersionRepositoryError,
} from './prompt-version.error.js';

export class PromptVersionDrizzleRepository implements IPromptVersionRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: NewPromptVersionRecord): Promise<PromptVersionRecord> {
    const [record] = await this.db.insert(aiPromptVersions).values(data).returning();
    if (!record) {
      throw new PromptVersionRepositoryError('Insert returned no rows');
    }
    return record;
  }

  async findById(id: string): Promise<PromptVersionRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(aiPromptVersions)
      .where(eq(aiPromptVersions.id, id));
    return record;
  }

  async findActiveByPromptId(promptId: string): Promise<PromptVersionRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(aiPromptVersions)
      .where(and(eq(aiPromptVersions.promptId, promptId), eq(aiPromptVersions.isActive, true)));
    return record;
  }

  async listByPromptId(promptId: string): Promise<PromptVersionRecord[]> {
    return this.db.select().from(aiPromptVersions).where(eq(aiPromptVersions.promptId, promptId));
  }

  async setActive(promptId: string, versionId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(aiPromptVersions)
        .set({ isActive: false })
        .where(eq(aiPromptVersions.promptId, promptId));
      const [updated] = await tx
        .update(aiPromptVersions)
        .set({ isActive: true })
        .where(eq(aiPromptVersions.id, versionId))
        .returning();
      if (!updated) {
        throw new PromptVersionNotFoundRepoError(versionId);
      }
    });
  }

  async getNextVersion(promptId: string): Promise<number> {
    const [result] = await this.db
      .select({ maxVersion: sql<number>`coalesce(max(${aiPromptVersions.version}), 0)` })
      .from(aiPromptVersions)
      .where(eq(aiPromptVersions.promptId, promptId));
    return (result?.maxVersion ?? 0) + 1;
  }
}
