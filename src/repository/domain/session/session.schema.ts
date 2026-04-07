import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const aiSessions = pgTable('ai_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  mastraThreadId: varchar('mastra_thread_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  tenantId: varchar('tenant_id', { length: 255 }),
  promptSlug: varchar('prompt_slug', { length: 255 }).notNull(),
  resolvedPrompt: text('resolved_prompt').notNull(),
  purpose: varchar('purpose', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  title: varchar('title', { length: 200 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  lastMessage: text('last_message'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
});
