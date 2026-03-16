import { eq, ilike } from 'drizzle-orm';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { PostgresClient } from '@sanamyvn/foundation/database/postgres';
import type { AiRequiredSchema } from '@/shared/schema.js';
import { AI_DB } from '@/shared/tokens.js';
import { aiPrompts } from './prompt.schema.js';
import type { IPromptRepository } from './prompt.interface.js';
import type { PromptRecord, NewPromptRecord } from './prompt.model.js';
import {
  DuplicatePromptError,
  PromptNotFoundRepoError,
  PromptRepositoryError,
} from './prompt.error.js';

@Injectable()
export class PromptDrizzleRepository implements IPromptRepository {
  constructor(@Inject(AI_DB) private readonly db: PostgresClient<AiRequiredSchema>) {}

  async create(data: NewPromptRecord): Promise<PromptRecord> {
    try {
      const [record] = await this.db.db.insert(aiPrompts).values(data).returning();
      if (!record) {
        throw new PromptRepositoryError('Insert returned no rows');
      }
      return record;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicatePromptError(data.slug, error);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<PromptRecord | undefined> {
    const [record] = await this.db.db.select().from(aiPrompts).where(eq(aiPrompts.id, id));
    return record;
  }

  async findBySlug(slug: string): Promise<PromptRecord | undefined> {
    const [record] = await this.db.db.select().from(aiPrompts).where(eq(aiPrompts.slug, slug));
    return record;
  }

  async list(filter?: { search?: string }): Promise<PromptRecord[]> {
    const query = this.db.db.select().from(aiPrompts);
    if (filter?.search) {
      return query.where(ilike(aiPrompts.name, `%${filter.search}%`));
    }
    return query;
  }

  async update(id: string, data: Partial<NewPromptRecord>): Promise<PromptRecord> {
    const [record] = await this.db.db
      .update(aiPrompts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiPrompts.id, id))
      .returning();
    if (!record) {
      throw new PromptNotFoundRepoError(id);
    }
    return record;
  }

  async delete(id: string): Promise<void> {
    await this.db.db.delete(aiPrompts).where(eq(aiPrompts.id, id));
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Reflect.get(error, 'code') === '23505'
  );
}
