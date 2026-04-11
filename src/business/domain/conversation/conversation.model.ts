import type { MetricsContext } from '@/foundation/ai-metrics/ai-metrics.model.js';

/** A single pre-seeded message to inject into a new conversation thread. */
export interface SeedMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

/** Configuration for creating a new conversation. */
export interface ConversationConfig {
  readonly promptSlug: string;
  readonly promptParams: Record<string, unknown>;
  readonly userId: string;
  readonly tenantId?: string;
  readonly purpose: string;
  /** LLM model identifier override; falls back to the system default when omitted. */
  readonly model?: string;
  /** Pre-seeded messages to inject into the thread immediately after creation. */
  readonly seedMessages?: readonly SeedMessage[];
  /** Opaque attributes bag forwarded to AI metrics. Set once at creation, inherited by all send/stream calls. */
  readonly metricsContext?: MetricsContext;
}

/** A live conversation handle tied to a session and model. */
export interface Conversation {
  readonly id: string;
  readonly sessionId: string;
  readonly promptSlug: string;
  /** Fully rendered system prompt used for this conversation. */
  readonly resolvedPrompt: string;
  /** LLM model identifier selected for this conversation. */
  readonly model: string;
}

/** The AI response returned after sending a message. */
export interface ConversationResponse {
  /** Plain-text response from the model. */
  readonly text: string;
  /** Structured output parsed from the response when an `outputSchema` was provided. */
  readonly object?: unknown;
}
