import { z } from 'zod';
import { createQuery, createCommand } from '@sanamyvn/foundation/mediator/request';
import { sessionClientModelSchema, sessionSummaryClientSchema } from './schemas.js';

export const FindSessionByIdQuery = createQuery({
  type: 'ai.session.findById',
  payload: z.object({ sessionId: z.string() }),
  response: sessionClientModelSchema,
});

export const ListSessionsQuery = createQuery({
  type: 'ai.session.list',
  payload: z.object({
    userId: z.string().optional(),
    tenantId: z.string().optional(),
    purpose: z.string().optional(),
    status: z.string().optional(),
  }),
  response: z.array(sessionSummaryClientSchema),
});

export const CreateSessionCommand = createCommand({
  type: 'ai.session.create',
  payload: z.object({
    userId: z.string(),
    tenantId: z.string().optional(),
    promptSlug: z.string(),
    resolvedPrompt: z.string(),
    purpose: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  response: sessionClientModelSchema,
});

export const EndSessionCommand = createCommand({
  type: 'ai.session.end',
  payload: z.object({ sessionId: z.string() }),
  response: z.void(),
});

export const UpdateSessionCommand = createCommand({
  type: 'ai.session.update',
  payload: z.object({
    sessionId: z.string(),
    resolvedPrompt: z.string(),
  }),
  response: z.void(),
});
