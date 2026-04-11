// src/foundation/ai-metrics/ai-metrics.testing.ts
import { vi } from 'vitest';
import type { IAiMetrics } from './ai-metrics.interface.js';

/**
 * Creates a mock {@link IAiMetrics} with all methods stubbed via `vi.fn()`.
 * Use in unit tests to verify metric emission without real OTel infrastructure.
 *
 * @example
 * ```typescript
 * const metrics = createMockAiMetrics();
 * adapter.generate('hello', { metricsContext: { 'ai.operation': 'ta_chat' } });
 * expect(metrics.recordLlmUsage).toHaveBeenCalledOnce();
 * ```
 */
export function createMockAiMetrics(): {
  [K in keyof IAiMetrics]: ReturnType<typeof vi.fn<IAiMetrics[K]>>;
} {
  return {
    recordLlmUsage: vi.fn<IAiMetrics['recordLlmUsage']>(),
    recordSttUsage: vi.fn<IAiMetrics['recordSttUsage']>(),
    recordTtsUsage: vi.fn<IAiMetrics['recordTtsUsage']>(),
    recordEmbeddingUsage: vi.fn<IAiMetrics['recordEmbeddingUsage']>(),
    recordOperation: vi.fn<IAiMetrics['recordOperation']>(),
  };
}
