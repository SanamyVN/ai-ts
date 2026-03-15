import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { PromptVersionRecord, NewPromptVersionRecord } from './prompt-version.model.js';

export interface IPromptVersionRepository {
  create(data: NewPromptVersionRecord): Promise<PromptVersionRecord>;
  findById(id: string): Promise<PromptVersionRecord | undefined>;
  findActiveByPromptId(promptId: string): Promise<PromptVersionRecord | undefined>;
  listByPromptId(promptId: string): Promise<PromptVersionRecord[]>;
  setActive(promptId: string, versionId: string): Promise<void>;
  getNextVersion(promptId: string): Promise<number>;
}

export const PROMPT_VERSION_REPOSITORY = createToken<IPromptVersionRepository>(
  'PROMPT_VERSION_REPOSITORY',
);
