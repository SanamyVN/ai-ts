import { z } from 'zod';

export const promptClientModelSchema = z.object({
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
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PromptClientModel = z.infer<typeof promptClientModelSchema>;

export const resolvedPromptClientSchema = z.object({
  slug: z.string(),
  version: z.number(),
  text: z.string(),
});

export type ResolvedPromptClient = z.infer<typeof resolvedPromptClientSchema>;
