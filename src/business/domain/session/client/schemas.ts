import { z } from 'zod';

export const sessionClientModelSchema = z.object({
  id: z.string(),
  mastraThreadId: z.string(),
  userId: z.string(),
  promptSlug: z.string(),
  resolvedPrompt: z.string(),
  purpose: z.string(),
  status: z.string(),
  title: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  lastMessage: z.string().nullable(),
  lastMessageAt: z.coerce.date().nullable(),
});

export type SessionClientModel = z.infer<typeof sessionClientModelSchema>;

export const sessionSummaryClientSchema = z.object({
  id: z.string(),
  userId: z.string(),
  promptSlug: z.string(),
  purpose: z.string(),
  status: z.string(),
  title: z.string().nullable(),
  startedAt: z.coerce.date(),
  lastMessage: z.string().nullable(),
  lastMessageAt: z.coerce.date().nullable(),
  /** User-submitted messages only — excludes seed messages, system prompts, and assistant replies. */
  messageCount: z.number().int().nonnegative(),
});

export type SessionSummaryClient = z.infer<typeof sessionSummaryClientSchema>;

export const messageClientSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.coerce.date(),
});
export type MessageClient = z.infer<typeof messageClientSchema>;

export const messageListClientSchema = z.object({
  items: z.array(messageClientSchema), // RENAMED from `messages` (pre-v1.28.0)
  page: z.number(),
  perPage: z.number(),
  /**
   * Total count of messages in this thread across all pages.
   * Non-negative integer; sourced from Mastra recall() at query time.
   * This is NOT the same as `SessionSummary.messageCount` — that field
   * counts only successful user submissions from the local ai_session_messages
   * ledger. This `total` counts the full stored transcript (all roles). (§2)
   */
  total: z.number().int().nonnegative(),
});
export type MessageListClient = z.infer<typeof messageListClientSchema>;
