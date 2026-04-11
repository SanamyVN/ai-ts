// src/foundation/ai-metrics/ai-metrics.interface.ts
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  LlmUsageInput,
  SttUsageInput,
  TtsUsageInput,
  EmbeddingUsageInput,
  OperationInput,
} from './ai-metrics.model.js';

/** Service that emits AI cost metrics via OTel counters and histograms. */
export interface IAiMetrics {
  /** Record LLM token usage (generate or stream finish). */
  recordLlmUsage(input: LlmUsageInput): void;

  /** Record speech-to-text processing. */
  recordSttUsage(input: SttUsageInput): void;

  /** Record text-to-speech processing. */
  recordTtsUsage(input: TtsUsageInput): void;

  /** Record RAG embedding token usage. */
  recordEmbeddingUsage(input: EmbeddingUsageInput): void;

  /** Record an AI operation (success or error) with latency. */
  recordOperation(input: OperationInput): void;
}

/** Dependency-injection token for {@link IAiMetrics}. */
export const AI_METRICS = createToken<IAiMetrics>('AI_METRICS');
