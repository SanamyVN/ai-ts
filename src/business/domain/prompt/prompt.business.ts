// src/business/domain/prompt/prompt.business.ts
import Mustache from 'mustache';
import type { IPromptRepository } from '@/repository/domain/prompt/prompt.interface.js';
import type { IPromptVersionRepository } from '@/repository/domain/prompt-version/prompt-version.interface.js';
import { isDuplicatePromptError } from '@/repository/domain/prompt/prompt.error.js';
import type { IPromptService } from './prompt.interface.js';
import type {
  PromptTemplate,
  PromptVersion,
  ResolvedPrompt,
  CreatePromptInput,
  UpdatePromptInput,
  CreateVersionInput,
  PromptFilter,
} from './prompt.model.js';
import {
  PromptNotFoundError,
  PromptAlreadyExistsError,
  PromptRenderError,
  InvalidPromptParametersError,
} from './prompt.error.js';
import { toPromptTemplateFromRecord, toPromptVersionFromRecord } from './prompt.mapper.js';

export class PromptService implements IPromptService {
  constructor(
    private readonly promptRepo: IPromptRepository,
    private readonly versionRepo: IPromptVersionRepository,
  ) {}

  async create(input: CreatePromptInput): Promise<PromptTemplate> {
    try {
      const record = await this.promptRepo.create(input);
      return toPromptTemplateFromRecord(record);
    } catch (error) {
      if (isDuplicatePromptError(error)) {
        throw new PromptAlreadyExistsError(input.slug, error);
      }
      throw error;
    }
  }

  async getBySlug(slug: string): Promise<PromptTemplate> {
    const record = await this.promptRepo.findBySlug(slug);
    if (!record) {
      throw new PromptNotFoundError(slug);
    }
    const activeVersion = await this.versionRepo.findActiveByPromptId(record.id);
    return toPromptTemplateFromRecord(record, activeVersion ?? undefined);
  }

  async list(filter?: PromptFilter): Promise<PromptTemplate[]> {
    const records = await this.promptRepo.list(filter);
    return records.map((r) => toPromptTemplateFromRecord(r));
  }

  async update(id: string, input: UpdatePromptInput): Promise<PromptTemplate> {
    const record = await this.promptRepo.update(id, input);
    return toPromptTemplateFromRecord(record);
  }

  async createVersion(promptId: string, input: CreateVersionInput): Promise<PromptVersion> {
    const nextVersion = await this.versionRepo.getNextVersion(promptId);
    const record = await this.versionRepo.create({
      promptId,
      version: nextVersion,
      template: input.template,
      isActive: input.activate ?? false,
    });
    if (input.activate) {
      await this.versionRepo.setActive(promptId, record.id);
    }
    return toPromptVersionFromRecord(record);
  }

  async listVersions(promptId: string): Promise<PromptVersion[]> {
    const records = await this.versionRepo.listByPromptId(promptId);
    return records.map(toPromptVersionFromRecord);
  }

  async setActiveVersion(promptId: string, versionId: string): Promise<void> {
    await this.versionRepo.setActive(promptId, versionId);
  }

  async resolve(slug: string, params: Record<string, unknown>): Promise<ResolvedPrompt> {
    const record = await this.promptRepo.findBySlug(slug);
    if (!record) {
      throw new PromptNotFoundError(slug);
    }
    const activeVersion = await this.versionRepo.findActiveByPromptId(record.id);
    if (!activeVersion) {
      throw new PromptNotFoundError(`${slug} (no active version)`);
    }
    if (record.parameterSchema) {
      this.validateParams(slug, record.parameterSchema, params);
    }
    try {
      const text = Mustache.render(activeVersion.template, params);
      return { slug, version: activeVersion.version, text };
    } catch (error) {
      throw new PromptRenderError(slug, error);
    }
  }

  private validateParams(
    slug: string,
    schema: Record<string, unknown>,
    params: Record<string, unknown>,
  ): void {
    for (const [key, def] of Object.entries(schema)) {
      const fieldDef = def as { type: string; min?: number; max?: number };
      const value = params[key];
      if (value === undefined) {
        throw new InvalidPromptParametersError(slug, `Missing required parameter: ${key}`);
      }
      if (fieldDef.type === 'string' && typeof value !== 'string') {
        throw new InvalidPromptParametersError(slug, `Parameter "${key}" must be a string`);
      }
      if (fieldDef.type === 'number' && typeof value !== 'number') {
        throw new InvalidPromptParametersError(slug, `Parameter "${key}" must be a number`);
      }
      if (fieldDef.type === 'number' && typeof value === 'number') {
        if (fieldDef.min !== undefined && value < fieldDef.min) {
          throw new InvalidPromptParametersError(
            slug,
            `Parameter "${key}" must be >= ${fieldDef.min}`,
          );
        }
        if (fieldDef.max !== undefined && value > fieldDef.max) {
          throw new InvalidPromptParametersError(
            slug,
            `Parameter "${key}" must be <= ${fieldDef.max}`,
          );
        }
      }
    }
  }
}
