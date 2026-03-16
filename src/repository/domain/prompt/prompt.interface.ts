import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { PromptRecord, NewPromptRecord } from './prompt.model.js';

/** Stores and retrieves prompt templates from the database. */
export interface IPromptRepository {
  /**
   * Persist a new prompt.
   * @param data - Fields for the new prompt record.
   * @returns The created prompt record.
   * @throws {DuplicatePromptError} When a prompt with the same slug already exists.
   */
  create(data: NewPromptRecord): Promise<PromptRecord>;

  /**
   * Look up a prompt by its unique ID.
   * @param id - Primary-key identifier.
   * @returns The matching record, or `undefined` if not found.
   */
  findById(id: string): Promise<PromptRecord | undefined>;

  /**
   * Look up a prompt by its human-readable slug.
   * @param slug - Unique slug string.
   * @returns The matching record, or `undefined` if not found.
   */
  findBySlug(slug: string): Promise<PromptRecord | undefined>;

  /**
   * List prompts, optionally filtered by a search term.
   * @param filter - Optional filter with a `search` substring match.
   * @returns Array of matching prompt records.
   */
  list(filter?: { search?: string }): Promise<PromptRecord[]>;

  /**
   * Update an existing prompt.
   * @param id - ID of the prompt to update.
   * @param data - Partial fields to merge into the existing record.
   * @returns The updated prompt record.
   * @throws {PromptNotFoundRepoError} When no prompt exists with the given ID.
   */
  update(id: string, data: Partial<NewPromptRecord>): Promise<PromptRecord>;

  /**
   * Delete a prompt by ID.
   * @param id - ID of the prompt to delete.
   * @throws {PromptNotFoundRepoError} When no prompt exists with the given ID.
   */
  delete(id: string): Promise<void>;
}

/** Dependency-injection token for {@link IPromptRepository}. */
export const PROMPT_REPOSITORY = createToken<IPromptRepository>('PROMPT_REPOSITORY');
