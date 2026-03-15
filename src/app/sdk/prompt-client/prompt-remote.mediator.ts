import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IPromptMediator } from '@/business/domain/prompt/client/mediator.js';
import type {
  PromptClientModel,
  ResolvedPromptClient,
} from '@/business/domain/prompt/client/schemas.js';
import {
  promptClientModelSchema,
  resolvedPromptClientSchema,
} from '@/business/domain/prompt/client/schemas.js';
import type {
  FindPromptBySlugQuery,
  ListPromptsQuery,
  ResolvePromptQuery,
  CreatePromptCommand,
  CreateVersionCommand,
  SetActiveVersionCommand,
} from '@/business/domain/prompt/client/queries.js';
import { PromptNotFoundClientError } from '@/business/domain/prompt/client/errors.js';
import { z } from 'zod';

/** HTTP client interface for making requests to the prompt service. */
export interface HttpClient {
  get(
    url: string,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  post(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  patch(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
}

/** Internal token for the HTTP client used by the remote prompt mediator. */
export const AI_PROMPT_HTTP_CLIENT = createToken<HttpClient>('AI_PROMPT_HTTP_CLIENT');

/** Internal token for the remote prompt service config. */
export const AI_PROMPT_REMOTE_CONFIG = createToken<{ baseUrl: string }>('AI_PROMPT_REMOTE_CONFIG');

/**
 * Microservice adapter — makes HTTP calls to the prompt service.
 *
 * Used when the prompt service runs as a separate deployment.
 */
@Injectable()
export class PromptRemoteMediator implements IPromptMediator {
  constructor(
    @Inject(AI_PROMPT_HTTP_CLIENT) private readonly http: HttpClient,
    @Inject(AI_PROMPT_REMOTE_CONFIG) private readonly config: { baseUrl: string },
  ) {}

  async findBySlug(query: InstanceType<typeof FindPromptBySlugQuery>): Promise<PromptClientModel> {
    const response = await this.http.get(`${this.config.baseUrl}/ai/prompts/${query.slug}`);
    if (!response.ok) {
      if (response.status === 404) throw new PromptNotFoundClientError(query.slug);
      throw new Error(`Failed to fetch prompt: ${response.status}`);
    }
    return promptClientModelSchema.parse(response.body?.data);
  }

  async list(query: InstanceType<typeof ListPromptsQuery>): Promise<PromptClientModel[]> {
    const search = query.search ? `?search=${encodeURIComponent(query.search)}` : '';
    const response = await this.http.get(`${this.config.baseUrl}/ai/prompts${search}`);
    if (!response.ok) {
      throw new Error(`Failed to list prompts: ${response.status}`);
    }
    return z.array(promptClientModelSchema).parse(response.body?.data ?? []);
  }

  async resolve(query: InstanceType<typeof ResolvePromptQuery>): Promise<ResolvedPromptClient> {
    const response = await this.http.post(
      `${this.config.baseUrl}/ai/prompts/${query.slug}/resolve`,
      { params: query.params },
    );
    if (!response.ok) {
      if (response.status === 404) throw new PromptNotFoundClientError(query.slug);
      throw new Error(`Failed to resolve prompt: ${response.status}`);
    }
    return resolvedPromptClientSchema.parse(response.body?.data);
  }

  async create(command: InstanceType<typeof CreatePromptCommand>): Promise<PromptClientModel> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/prompts`, {
      name: command.name,
      slug: command.slug,
      parameterSchema: command.parameterSchema,
      metadata: command.metadata,
    });
    if (!response.ok) {
      throw new Error(`Failed to create prompt: ${response.status}`);
    }
    return promptClientModelSchema.parse(response.body?.data);
  }

  async createVersion(
    command: InstanceType<typeof CreateVersionCommand>,
  ): Promise<PromptClientModel> {
    const response = await this.http.post(
      `${this.config.baseUrl}/ai/prompts/${command.promptId}/versions`,
      { template: command.template, activate: command.activate },
    );
    if (!response.ok) {
      if (response.status === 404) throw new PromptNotFoundClientError(command.promptId);
      throw new Error(`Failed to create prompt version: ${response.status}`);
    }
    return promptClientModelSchema.parse(response.body?.data);
  }

  async setActiveVersion(command: InstanceType<typeof SetActiveVersionCommand>): Promise<void> {
    const response = await this.http.patch(
      `${this.config.baseUrl}/ai/prompts/${command.promptId}/versions/${command.versionId}/activate`,
      {},
    );
    if (!response.ok) {
      throw new Error(`Failed to set active version: ${response.status}`);
    }
  }
}
