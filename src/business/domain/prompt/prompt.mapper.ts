import type { PromptRecord } from '@/repository/domain/prompt/prompt.model.js';
import type { PromptVersionRecord } from '@/repository/domain/prompt-version/prompt-version.model.js';
import type { PromptTemplate, PromptVersion } from './prompt.model.js';

export function toPromptTemplateFromRecord(
  record: PromptRecord,
  activeVersion?: PromptVersionRecord,
): PromptTemplate {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    parameterSchema: record.parameterSchema,
    metadata: record.metadata,
    ...(activeVersion !== undefined
      ? { activeVersion: toPromptVersionFromRecord(activeVersion) }
      : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toPromptVersionFromRecord(record: PromptVersionRecord): PromptVersion {
  return {
    id: record.id,
    promptId: record.promptId,
    version: record.version,
    template: record.template,
    isActive: record.isActive,
    createdAt: record.createdAt,
  };
}
