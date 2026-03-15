import { z } from 'zod';

export const sessionClientModelSchema = z.object({
  id: z.string(),
  mastraThreadId: z.string(),
  userId: z.string(),
  tenantId: z.string().nullable(),
  promptSlug: z.string(),
  purpose: z.string(),
  status: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
});

export type SessionClientModel = z.infer<typeof sessionClientModelSchema>;

export const sessionSummaryClientSchema = z.object({
  id: z.string(),
  userId: z.string(),
  promptSlug: z.string(),
  purpose: z.string(),
  status: z.string(),
  startedAt: z.date(),
});

export type SessionSummaryClient = z.infer<typeof sessionSummaryClientSchema>;
