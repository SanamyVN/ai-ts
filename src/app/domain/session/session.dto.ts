import { z } from 'zod';

export const sessionListQueryDto = z.object({
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  purpose: z.string().optional(),
  status: z.string().optional(),
});
export type SessionListQueryDto = z.infer<typeof sessionListQueryDto>;

export const paginationQueryDto = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().optional(),
});
export type PaginationQueryDto = z.infer<typeof paginationQueryDto>;

export const transcriptQueryDto = z.object({
  format: z.enum(['json', 'text']).optional(),
});
export type TranscriptQueryDto = z.infer<typeof transcriptQueryDto>;

export const updateSessionTitleDto = z.object({
  title: z.string(),
});
export type UpdateSessionTitleDto = z.infer<typeof updateSessionTitleDto>;

export const sessionResponseDto = z.object({
  id: z.string(),
  mastraThreadId: z.string(),
  userId: z.string(),
  tenantId: z.string().nullable(),
  promptSlug: z.string(),
  resolvedPrompt: z.string(),
  purpose: z.string(),
  status: z.string(),
  title: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});
export type SessionResponseDto = z.infer<typeof sessionResponseDto>;

export const sessionSummaryResponseDto = z.object({
  id: z.string(),
  userId: z.string(),
  promptSlug: z.string(),
  purpose: z.string(),
  status: z.string(),
  title: z.string().nullable(),
  startedAt: z.string(),
});
export type SessionSummaryResponseDto = z.infer<typeof sessionSummaryResponseDto>;

export const messageResponseDto = z.object({
  id: z.string().optional(),
  role: z.string(),
  content: z.string(),
  createdAt: z.string().optional(),
});
export type MessageResponseDto = z.infer<typeof messageResponseDto>;

export const transcriptResponseDto = z.object({
  format: z.enum(['json', 'text']),
  content: z.string().optional(),
  messages: z.array(messageResponseDto).optional(),
});
export type TranscriptResponseDto = z.infer<typeof transcriptResponseDto>;
