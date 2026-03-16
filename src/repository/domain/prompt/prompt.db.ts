import { eq, ilike } from 'drizzle-orm';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { PostgresClient } from '@sanamyvn/foundation/database/postgres';
import type { AiSchema } from '@/shared/schema.js';
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
  constructor(@Inject(AI_DB) private readonly db: PostgresClient<AiSchema>) {}

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

function hasCode23505(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err && Reflect.get(err, 'code') === '23505'
  );
}

/** Check the error and its cause chain for a Postgres unique violation (23505). */
function isUniqueViolation(error: unknown): boolean {
  if (hasCode23505(error)) return true;
  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return hasCode23505(Reflect.get(error, 'cause'));
  }
  return false;
}
