// src/foundation/ai-metrics/ai-metrics.model.ts

/** Opaque attributes bag passed by the caller (e.g., user.role, course.id). */
export type MetricsContext = Readonly<Record<string, string>>;

/** Input for recording LLM token usage from a generate or stream-finish event. */
export interface LlmUsageInput {
  readonly model: string;
  readonly userId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly metricsContext?: MetricsContext;
}

/** Input for recording speech-to-text processing. */
export interface SttUsageInput {
  readonly model: string;
  readonly userId: string;
  readonly durationSeconds: number;
  readonly metricsContext?: MetricsContext;
}

/** Input for recording text-to-speech processing. */
export interface TtsUsageInput {
  readonly model: string;
  readonly userId: string;
  readonly characterCount: number;
  readonly metricsContext?: MetricsContext;
}

/** Input for recording RAG embedding token usage. */
export interface EmbeddingUsageInput {
  readonly model: string;
  readonly userId: string;
  readonly totalTokens: number;
  readonly metricsContext?: MetricsContext;
}

/** Input for recording an AI operation (success or error) with latency. */
export interface OperationInput {
  readonly model: string;
  readonly userId: string;
  readonly status: 'success' | 'error';
  readonly latencyMs: number;
  readonly metricsContext?: MetricsContext;
}
