import type { PromptTemplate, ResolvedPrompt } from '@/business/domain/prompt/prompt.model.js';
import type {
  PromptClientModel,
  ResolvedPromptClient,
} from '@/business/domain/prompt/client/schemas.js';

/**
 * Converts a business-layer PromptTemplate to the client model.
 * Used by PromptLocalMediator in monolith mode.
 */
export function toPromptClientModelFromBusiness(model: PromptTemplate): PromptClientModel {
  return {
    id: model.id,
    name: model.name,
    slug: model.slug,
    parameterSchema: model.parameterSchema,
    metadata: model.metadata,
    ...(model.activeVersion !== undefined
      ? {
          activeVersion: {
            id: model.activeVersion.id,
            version: model.activeVersion.version,
            template: model.activeVersion.template,
            isActive: model.activeVersion.isActive,
          },
        }
      : {}),
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

/**
 * Converts a business-layer ResolvedPrompt to the client model.
 * Used by PromptLocalMediator in monolith mode.
 */
export function toResolvedPromptClientFromBusiness(model: ResolvedPrompt): ResolvedPromptClient {
  return {
    slug: model.slug,
    version: model.version,
    text: model.text,
  };
}
