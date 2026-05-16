import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Append-only event ledger recording every successful user message per session.
 * Rows are written after the underlying LLM call succeeds. No update or delete
 * path exists in application code. (§1)
 *
 * `purpose` is denormalized from `ai_sessions` at insert time so billing scans
 * stay single-table. The field is immutable on `ai_sessions` after creation,
 * bounding drift risk.
 *
 * Tenant isolation is the host app's responsibility via Postgres `search_path`
 * set in the caller's transaction. ai-ts neither reads nor writes a tenant
 * identifier. (§6, v2.0)
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
