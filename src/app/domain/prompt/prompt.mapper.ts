import type { PromptClientModel } from '@/business/domain/prompt/client/schemas.js';
import type { PromptResponseDto } from './prompt.dto.js';

export function toPromptResponseDtoFromClient(model: PromptClientModel): PromptResponseDto {
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
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}
