/** Configuration for creating a new conversation. */
export interface ConversationConfig {
  readonly promptSlug: string;
  readonly promptParams: Record<string, unknown>;
  readonly userId: string;
  readonly tenantId?: string;
  readonly purpose: string;
  /** LLM model identifier override; falls back to the system default when omitted. */
  readonly model?: string;
  /** JSON Schema describing the expected structured output, enabling structured-output mode. */
  readonly outputSchema?: unknown;
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
