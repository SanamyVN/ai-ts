export interface ConversationConfig {
  readonly promptSlug: string;
  readonly promptParams: Record<string, unknown>;
  readonly userId: string;
  readonly tenantId?: string;
  readonly purpose: string;
  readonly model?: string;
  readonly outputSchema?: unknown;
}

export interface Conversation {
  readonly id: string;
  readonly sessionId: string;
  readonly promptSlug: string;
  readonly resolvedPrompt: string;
  readonly model: string;
}

export interface ConversationResponse {
  readonly text: string;
  readonly object?: unknown;
}
