import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Append-only event ledger recording every successful user message per session.
 * Rows are written after the underlying LLM call succeeds. No update or delete
 * path exists in application code. (§1)
 *
 * No FK constraint on `session_id` — see §1 design decisions.
 */
export const aiSessionMessages = pgTable('ai_session_messages', {
  /** ULID or UUID supplied by the caller. ON CONFLICT (id) DO NOTHING makes inserts idempotent. */
  id: text('id').primaryKey(),
  /** References ai_sessions.id — enforced by the application, not the DB. */
  sessionId: text('session_id').notNull(),
  /** Denormalized from ai_sessions.purpose at insert time. */
  purpose: text('purpose').notNull(),
  /** Wall-clock time the user message was sent. Used for billing period scans. */
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});
