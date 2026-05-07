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
   * Total user-submitted messages persisted against this session over its lifetime.
   * Excludes seed messages, system prompts, and assistant replies.
   * Sourced from the append-only `ai_session_messages` ledger via a per-page
   * `countBySession` query; reflects the count at query time. (§1)
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
   * Case-sensitive prefix match against the session purpose.
   * Translates to `WHERE purpose LIKE $prefix || '%'`.
   * Cannot be an empty string. Mutually exclusive with `purpose`. (§3)
   */
  readonly purposePrefix?: string;
  readonly status?: string;
  /** Case-insensitive substring match against the session title. */
  readonly search?: string;
  /**
   * Half-open lower bound for session start time: include sessions where
   * `started_at >= startedAtGte`. Combine with `startedAtLt` to express a
   * display window `[Gte, Lt)`.
   *
   * Note: this filters on session start time, not message send time. For
   * billing, use `CountMessagesByTenantQuery` which scopes on `sentAt`. (§2)
   */
  readonly startedAtGte?: Date;
  /**
   * Half-open upper bound for session start time: exclude sessions where
   * `started_at >= startedAtLt`. Must be strictly greater than `startedAtGte`
   * when both are provided. (§2)
   */
  readonly startedAtLt?: Date;
}

/**
 * Filter for the `countMessagesByTenant` aggregate.
 * `tenantId` is required — billing is always per-tenant (§4).
 * Time fields scope on **message send time** (`sentAt`), not session start time.
 */
export interface CountMessagesFilter {
  readonly tenantId: string;
  readonly purpose?: string;
  /**
   * Case-sensitive prefix match on purpose. Mutually exclusive with `purpose`.
   * Cannot be an empty string. (§3, §4)
   */
  readonly purposePrefix?: string;
  /**
   * Half-open lower bound: count events where `sent_at >= sentAtGte`.
   * Combine with `sentAtLt` for a billing period `[Gte, Lt)`. (§4)
   */
  readonly sentAtGte?: Date;
  /**
   * Half-open upper bound: exclude events where `sent_at >= sentAtLt`.
   * Must be strictly greater than `sentAtGte` when both are provided. (§4)
   */
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
