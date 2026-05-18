import { z } from 'zod';

export const sessionListQueryDto = z
  .object({
    userId: z.string().optional(),
    userIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : [v]))
      .optional(),
    purpose: z.string().optional(),
    purposePrefix: z.string().min(1).optional(),
    status: z.string().optional(),
    search: z.string().max(200).optional(),
    startedAtGte: z.iso.datetime({ offset: true }).optional(),
    startedAtLt: z.iso.datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1),
    perPage: z.coerce.number().int().min(1).max(500),
  })
  .refine((q) => !(q.purpose !== undefined && q.purposePrefix !== undefined), {
    message: 'purpose and purposePrefix are mutually exclusive',
  })
  .refine(
    (q) =>
      !(
        q.startedAtLt !== undefined &&
        q.startedAtGte !== undefined &&
        Date.parse(q.startedAtLt) <= Date.parse(q.startedAtGte)
      ),
    { message: 'startedAtLt must be strictly greater than startedAtGte' },
  );
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

export const updateTitleBodyDto = z.object({
  title: z.string().min(1).max(100),
});
export type UpdateTitleBodyDto = z.infer<typeof updateTitleBodyDto>;

export const sessionResponseDto = z.object({
  id: z.string(),
  mastraThreadId: z.string(),
  userId: z.string(),
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
  startedAt: z.iso.datetime({ offset: true }),
  lastMessage: z.string().nullable(),
  lastMessageAt: z.iso.datetime({ offset: true }).nullable(),
  messageCount: z.number().int().nonnegative(),
});
export type SessionSummaryResponseDto = z.infer<typeof sessionSummaryResponseDto>;

export const countMessagesQueryDto = z
  .object({
    purpose: z.string().optional(),
    purposePrefix: z.string().min(1).optional(),
    sentAtGte: z.iso.datetime({ offset: true }).optional(),
    sentAtLt: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((q) => !(q.purpose !== undefined && q.purposePrefix !== undefined), {
    message: 'purpose and purposePrefix are mutually exclusive',
  })
  .refine(
    (q) =>
      !(
        q.sentAtLt !== undefined &&
        q.sentAtGte !== undefined &&
        Date.parse(q.sentAtLt) <= Date.parse(q.sentAtGte)
      ),
    { message: 'sentAtLt must be strictly greater than sentAtGte' },
  );
export type CountMessagesQueryDto = z.infer<typeof countMessagesQueryDto>;

export const countMessagesResponseDto = z.object({
  count: z.number().int().nonnegative(),
});
export type CountMessagesResponseDto = z.infer<typeof countMessagesResponseDto>;

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
