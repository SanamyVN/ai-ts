import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { PromptClientModel, ResolvedPromptClient } from './schemas.js';
import {
  FindPromptBySlugQuery,
  ListPromptsQuery,
  ResolvePromptQuery,
  CreatePromptCommand,
  CreateVersionCommand,
  SetActiveVersionCommand,
} from './queries.js';

export interface IPromptMediator {
  findBySlug(query: InstanceType<typeof FindPromptBySlugQuery>): Promise<PromptClientModel>;
  list(query: InstanceType<typeof ListPromptsQuery>): Promise<PromptClientModel[]>;
  resolve(query: InstanceType<typeof ResolvePromptQuery>): Promise<ResolvedPromptClient>;
  create(command: InstanceType<typeof CreatePromptCommand>): Promise<PromptClientModel>;
  createVersion(command: InstanceType<typeof CreateVersionCommand>): Promise<PromptClientModel>;
  setActiveVersion(command: InstanceType<typeof SetActiveVersionCommand>): Promise<void>;
}

export const PROMPT_MEDIATOR = createMediatorToken<IPromptMediator>('PROMPT_MEDIATOR', {
  findBySlug: FindPromptBySlugQuery,
  list: ListPromptsQuery,
  resolve: ResolvePromptQuery,
  create: CreatePromptCommand,
  createVersion: CreateVersionCommand,
  setActiveVersion: SetActiveVersionCommand,
});
