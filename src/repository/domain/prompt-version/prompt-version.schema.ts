import { pgTable, uuid, integer, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { aiPrompts } from '../prompt/prompt.schema.js';

export const aiPromptVersions = pgTable('ai_prompt_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  promptId: uuid('prompt_id')
    .notNull()
    .references(() => aiPrompts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  template: text('template').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
