import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { PromptRecord, NewPromptRecord } from './prompt.model.js';

export interface IPromptRepository {
  create(data: NewPromptRecord): Promise<PromptRecord>;
  findById(id: string): Promise<PromptRecord | undefined>;
  findBySlug(slug: string): Promise<PromptRecord | undefined>;
  list(filter?: { search?: string }): Promise<PromptRecord[]>;
  update(id: string, data: Partial<NewPromptRecord>): Promise<PromptRecord>;
  delete(id: string): Promise<void>;
}

export const PROMPT_REPOSITORY = createToken<IPromptRepository>('PROMPT_REPOSITORY');
