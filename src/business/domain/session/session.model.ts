import type { Message, MessageList, Pagination } from '@/business/sdk/mastra/mastra.interface.js';

/** A stateful AI session bound to a user and a resolved prompt. */
export interface Session {
  readonly id: string;
  /** Mastra thread ID backing this session's message history. */
  readonly mastraThreadId: string;
  readonly userId: string;
  readonly tenantId: string | null;
  readonly promptSlug: string;
  /** Fully rendered system prompt text used for this session. */
  readonly resolvedPrompt: string;
  readonly purpose: string;
  readonly status: string;
  readonly title: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly lastMessage: string | null;
  readonly lastMessageAt: Date | null;
}

/** Lightweight projection of a session used in list results. */
export interface SessionSummary {
  readonly id: string;
  readonly userId: string;
  readonly promptSlug: string;
  readonly purpose: string;
  readonly status: string;
  readonly title: string | null;
  readonly startedAt: Date;
  readonly lastMessage: string | null;
  readonly lastMessageAt: Date | null;
  /**
   * User-submitted messages only — excludes seed messages, system prompts,
   * and assistant replies. Sourced from the append-only `ai_session_messages`
   * ledger; reflects the lifetime count for this session at query time. (§1)
   */
  readonly messageCount: number;
}

/** Input for starting a new session. The `resolvedPrompt` field is required. */
export interface StartSessionInput {
  readonly userId: string;
  readonly tenantId?: string;
  readonly promptSlug: string;
  /** Pre-rendered system prompt text; must be resolved before session creation. */
  readonly resolvedPrompt: string;
  readonly purpose: string;
  readonly metadata?: Record<string, unknown>;
}

/** Criteria for filtering sessions in list queries. */
export interface SessionFilter {
  readonly userId?: string;
  readonly userIds?: string[];
  readonly tenantId?: string;
  readonly purpose?: string;
  /**
   * Match sessions whose `purpose` starts with this string. Case-sensitive.
   * Mutually exclusive with `purpose`. Cannot be empty. (§3)
   */
  readonly purposePrefix?: string;
  readonly status?: string;
  /** Case-insensitive substring match against the session title. */
  readonly search?: string;
  /**
   * Lower bound (inclusive) on session `started_at`. Together with
   * `startedAtLt` forms the half-open interval `[Gte, Lt)` over session
   * start time. Use `CountMessagesByTenantQuery` for billing — it scopes
   * on message **send** time, not session start time. (§2)
   */
  readonly startedAtGte?: Date;
  /**
   * Upper bound (exclusive) on session `started_at`. See `startedAtGte`. (§2)
   */
  readonly startedAtLt?: Date;
}

/**
 * Filter for `CountMessagesByTenantQuery` — counts messages in the
 * `ai_session_messages` ledger whose `sent_at` falls in the half-open
 * interval `[sentAtGte, sentAtLt)`, regardless of session status.
 * `tenantId` is required to prevent cross-tenant aggregation. (§4)
 */
export interface CountMessagesFilter {
  /** Tenant scope — required. */
  readonly tenantId: string;
  /** Exact-match `purpose`. Mutually exclusive with `purposePrefix`. */
  readonly purpose?: string;
  /** Prefix-match `purpose` (case-sensitive). Cannot be empty. (§3) */
  readonly purposePrefix?: string;
  /** Lower bound (inclusive) on message `sent_at`. */
  readonly sentAtGte?: Date;
  /** Upper bound (exclusive) on message `sent_at`. */
  readonly sentAtLt?: Date;
}

/** An exported session transcript containing formatted content and raw messages. */
export interface Transcript {
  readonly sessionId: string;
  readonly format: 'json' | 'text';
  /** Formatted transcript string in the requested format. */
  readonly content: string;
  readonly messages: Message[];
}

export { type Message, type MessageList, type Pagination };
