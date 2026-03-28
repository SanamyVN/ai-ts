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
  readonly startedAt: Date;
  readonly lastMessage: string | null;
  readonly lastMessageAt: Date | null;
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
  readonly tenantId?: string;
  readonly purpose?: string;
  readonly status?: string;
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
