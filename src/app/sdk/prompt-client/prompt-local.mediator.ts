import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { PROMPT_SERVICE, type IPromptService } from '@/business/domain/prompt/prompt.interface.js';
import {
  PROMPT_REPOSITORY,
  type IPromptRepository,
} from '@/repository/domain/prompt/prompt.interface.js';
import type { IPromptMediator } from '@/business/domain/prompt/client/mediator.js';
import type {
  PromptClientModel,
  ResolvedPromptClient,
} from '@/business/domain/prompt/client/schemas.js';
import type {
  FindPromptBySlugQuery,
  ListPromptsQuery,
  ResolvePromptQuery,
  CreatePromptCommand,
  CreateVersionCommand,
  SetActiveVersionCommand,
} from '@/business/domain/prompt/client/queries.js';
import {
  toPromptClientModelFromBusiness,
  toResolvedPromptClientFromBusiness,
} from './prompt.mapper.js';
import { toPromptTemplateFromRecord } from '@/business/domain/prompt/prompt.mapper.js';
import { PromptNotFoundClientError } from '@/business/domain/prompt/client/errors.js';

/**
 * Monolith adapter — wraps IPromptService in-process.
 *
 * Used when the prompt service runs in the same process as consuming features.
 * Injects IPromptRepository directly to support getById lookups needed after
 * createVersion (IPromptService only exposes getBySlug).
 */
@Injectable()
export class PromptLocalMediator implements IPromptMediator {
  constructor(
    @Inject(PROMPT_SERVICE) private readonly promptService: IPromptService,
    @Inject(PROMPT_REPOSITORY) private readonly promptRepo: IPromptRepository,
  ) {}

  async findBySlug(query: InstanceType<typeof FindPromptBySlugQuery>): Promise<PromptClientModel> {
    const result = await this.promptService.getBySlug(query.slug);
    return toPromptClientModelFromBusiness(result);
  }

  async list(query: InstanceType<typeof ListPromptsQuery>): Promise<PromptClientModel[]> {
    const results = await this.promptService.list(
      query.search !== undefined ? { search: query.search } : undefined,
    );
    return results.map(toPromptClientModelFromBusiness);
  }

  async resolve(query: InstanceType<typeof ResolvePromptQuery>): Promise<ResolvedPromptClient> {
    const result = await this.promptService.resolve(query.slug, query.params);
    return toResolvedPromptClientFromBusiness(result);
  }

  async create(command: InstanceType<typeof CreatePromptCommand>): Promise<PromptClientModel> {
    const result = await this.promptService.create({
      name: command.name,
      slug: command.slug,
      ...(command.parameterSchema !== undefined
        ? { parameterSchema: command.parameterSchema }
        : {}),
      ...(command.metadata !== undefined ? { metadata: command.metadata } : {}),
    });
    return toPromptClientModelFromBusiness(result);
  }

  async createVersion(
    command: InstanceType<typeof CreateVersionCommand>,
  ): Promise<PromptClientModel> {
    const version = await this.promptService.createVersion(command.promptId, {
      template: command.template,
      ...(command.activate !== undefined ? { activate: command.activate } : {}),
    });
    // IPromptService.getBySlug requires a slug but we only have the promptId.
    // Resolve via repository to get the full prompt template.
    const record = await this.promptRepo.findById(version.promptId);
    if (!record) {
      throw new PromptNotFoundClientError(version.promptId);
    }
    const template = toPromptTemplateFromRecord(record, command.activate ? version : undefined);
    return toPromptClientModelFromBusiness(template);
  }

  async setActiveVersion(command: InstanceType<typeof SetActiveVersionCommand>): Promise<void> {
    await this.promptService.setActiveVersion(command.promptId, command.versionId);
  }
}
