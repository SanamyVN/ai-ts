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
  [K in keyof IAiMetrics]: ReturnType<typeof vi.fn>;
} {
  return {
    recordLlmUsage: vi.fn(),
    recordSttUsage: vi.fn(),
    recordTtsUsage: vi.fn(),
    recordEmbeddingUsage: vi.fn(),
    recordOperation: vi.fn(),
  };
}
