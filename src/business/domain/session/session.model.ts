import type { Message, MessageList, Pagination } from '@/business/sdk/mastra/mastra.interface.js';

export interface Session {
  readonly id: string;
  readonly mastraThreadId: string;
  readonly userId: string;
  readonly tenantId: string | null;
  readonly promptSlug: string;
  readonly resolvedPrompt: string;
  readonly purpose: string;
  readonly status: string;
  readonly metadata: Record<string, unknown> | null;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
}

export interface SessionSummary {
  readonly id: string;
  readonly userId: string;
  readonly promptSlug: string;
  readonly purpose: string;
  readonly status: string;
  readonly startedAt: Date;
}

export interface StartSessionInput {
  readonly userId: string;
  readonly tenantId?: string;
  readonly promptSlug: string;
  readonly resolvedPrompt: string;
  readonly purpose: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SessionFilter {
  readonly userId?: string;
  readonly tenantId?: string;
  readonly purpose?: string;
  readonly status?: string;
}

export interface Transcript {
  readonly sessionId: string;
  readonly format: 'json' | 'text';
  readonly content: string;
  readonly messages: Message[];
}

export { type Message, type MessageList, type Pagination };
