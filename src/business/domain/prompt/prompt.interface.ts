import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  PromptTemplate,
  PromptVersion,
  ResolvedPrompt,
  CreatePromptInput,
  UpdatePromptInput,
  CreateVersionInput,
  PromptFilter,
} from './prompt.model.js';

export interface IPromptService {
  create(input: CreatePromptInput): Promise<PromptTemplate>;
  getBySlug(slug: string): Promise<PromptTemplate>;
  list(filter?: PromptFilter): Promise<PromptTemplate[]>;
  update(id: string, input: UpdatePromptInput): Promise<PromptTemplate>;

  createVersion(promptId: string, input: CreateVersionInput): Promise<PromptVersion>;
  listVersions(promptId: string): Promise<PromptVersion[]>;
  setActiveVersion(promptId: string, versionId: string): Promise<void>;

  resolve(slug: string, params: Record<string, unknown>): Promise<ResolvedPrompt>;
}

export const PROMPT_SERVICE = createToken<IPromptService>('PROMPT_SERVICE');
