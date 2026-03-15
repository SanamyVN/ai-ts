import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import {
  CreatePromptCommand,
  CreateVersionCommand,
  FindPromptBySlugQuery,
  ListPromptsQuery,
  SetActiveVersionCommand,
} from '@/business/domain/prompt/client/queries.js';
import { mapPromptError } from './prompt.error.js';
import { toPromptResponseDtoFromClient } from './prompt.mapper.js';
import type { PromptResponseDto } from './prompt.dto.js';

export class PromptAppService {
  constructor(private readonly mediator: IMediator) {}

  async create(input: {
    name: string;
    slug: string;
    parameterSchema?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<PromptResponseDto> {
    try {
      const result = await this.mediator.send(new CreatePromptCommand(input));
      return toPromptResponseDtoFromClient(result);
    } catch (error) {
      mapPromptError(error);
    }
  }

  async getBySlug(slug: string): Promise<PromptResponseDto> {
    try {
      const result = await this.mediator.send(new FindPromptBySlugQuery({ slug }));
      return toPromptResponseDtoFromClient(result);
    } catch (error) {
      mapPromptError(error);
    }
  }

  async list(query?: { search?: string }): Promise<PromptResponseDto[]> {
    const results = await this.mediator.send(new ListPromptsQuery(query ?? {}));
    return results.map(toPromptResponseDtoFromClient);
  }

  async createVersion(
    slug: string,
    input: { template: string; activate?: boolean },
  ): Promise<PromptResponseDto> {
    const prompt = await this.getBySlug(slug);
    try {
      const result = await this.mediator.send(
        new CreateVersionCommand({ promptId: prompt.id, ...input }),
      );
      return toPromptResponseDtoFromClient(result);
    } catch (error) {
      mapPromptError(error);
    }
  }

  async activateVersion(slug: string, versionId: string): Promise<void> {
    const prompt = await this.getBySlug(slug);
    await this.mediator.send(new SetActiveVersionCommand({ promptId: prompt.id, versionId }));
  }

  async listVersions(slug: string): Promise<PromptResponseDto> {
    return this.getBySlug(slug);
  }
}

export const PROMPT_APP_SERVICE = createToken<PromptAppService>('PROMPT_APP_SERVICE');
