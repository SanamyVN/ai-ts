import { z } from 'zod';

export const createPromptDto = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  parameterSchema: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePromptDto = z.infer<typeof createPromptDto>;

export const updatePromptDto = z.object({
  name: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdatePromptDto = z.infer<typeof updatePromptDto>;

export const createVersionDto = z.object({
  template: z.string().min(1),
  activate: z.boolean().optional(),
});
export type CreateVersionDto = z.infer<typeof createVersionDto>;

export const promptListQueryDto = z.object({
  search: z.string().optional(),
});
export type PromptListQueryDto = z.infer<typeof promptListQueryDto>;

export const promptResponseDto = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parameterSchema: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  activeVersion: z
    .object({
      id: z.string(),
      version: z.number(),
      template: z.string(),
      isActive: z.boolean(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PromptResponseDto = z.infer<typeof promptResponseDto>;
