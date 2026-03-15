import { z } from 'zod';
import { createQuery, createCommand } from '@sanamyvn/foundation/mediator/request';
import { promptClientModelSchema, resolvedPromptClientSchema } from './schemas.js';

export const FindPromptBySlugQuery = createQuery({
  type: 'ai.prompt.findBySlug',
  payload: z.object({ slug: z.string() }),
  response: promptClientModelSchema,
});

export const ListPromptsQuery = createQuery({
  type: 'ai.prompt.list',
  payload: z.object({ search: z.string().optional() }),
  response: z.array(promptClientModelSchema),
});

export const ResolvePromptQuery = createQuery({
  type: 'ai.prompt.resolve',
  payload: z.object({
    slug: z.string(),
    params: z.record(z.string(), z.unknown()),
  }),
  response: resolvedPromptClientSchema,
});

export const CreatePromptCommand = createCommand({
  type: 'ai.prompt.create',
  payload: z.object({
    name: z.string(),
    slug: z.string(),
    parameterSchema: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  response: promptClientModelSchema,
});

export const CreateVersionCommand = createCommand({
  type: 'ai.prompt.createVersion',
  payload: z.object({
    promptId: z.string(),
    template: z.string(),
    activate: z.boolean().optional(),
  }),
  response: promptClientModelSchema,
});

export const SetActiveVersionCommand = createCommand({
  type: 'ai.prompt.setActiveVersion',
  payload: z.object({
    promptId: z.string(),
    versionId: z.string(),
  }),
  response: z.void(),
});
