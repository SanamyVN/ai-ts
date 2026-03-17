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
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  outputSchema: jsonb('output_schema').$type<unknown>(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});
