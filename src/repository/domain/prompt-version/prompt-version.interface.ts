import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { PromptVersionRecord, NewPromptVersionRecord } from './prompt-version.model.js';

/** Stores and retrieves versioned prompt content linked to a parent prompt. */
export interface IPromptVersionRepository {
  /**
   * Persist a new prompt version.
   * @param data - Fields for the new version record.
   * @returns The created version record.
   */
  create(data: NewPromptVersionRecord): Promise<PromptVersionRecord>;

  /**
   * Look up a prompt version by its unique ID.
   * @param id - Primary-key identifier.
   * @returns The matching record, or `undefined` if not found.
   */
  findById(id: string): Promise<PromptVersionRecord | undefined>;

  /**
   * Find the currently active version for a given prompt.
   * @param promptId - Parent prompt ID.
   * @returns The active version record, or `undefined` if none is active.
   */
  findActiveByPromptId(promptId: string): Promise<PromptVersionRecord | undefined>;

  /**
   * List all versions belonging to a prompt.
   * @param promptId - Parent prompt ID.
   * @returns Array of version records.
   */
  listByPromptId(promptId: string): Promise<PromptVersionRecord[]>;

  /**
   * Mark a specific version as the active one for its prompt.
   * @param promptId - Parent prompt ID.
   * @param versionId - ID of the version to activate.
   * @throws {PromptVersionNotFoundRepoError} When the version does not exist.
   */
  setActive(promptId: string, versionId: string): Promise<void>;

  /**
   * Return the next sequential version number for a prompt.
   * @param promptId - Parent prompt ID.
   * @returns The next version number (1-based).
   */
  getNextVersion(promptId: string): Promise<number>;
}

/** Dependency-injection token for {@link IPromptVersionRepository}. */
export const PROMPT_VERSION_REPOSITORY = createToken<IPromptVersionRepository>(
  'PROMPT_VERSION_REPOSITORY',
);
