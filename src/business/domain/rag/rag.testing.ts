import { vi } from 'vitest';
import type { IRagBusiness } from './rag.interface.js';

/**
 * Creates a mock `IRagBusiness` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub RAG business behavior without real infrastructure.
 *
 * @example
 * const rag = createMockRagBusiness();
 * rag.ingest.mockResolvedValue({ chunksStored: 5 });
 */
export function createMockRagBusiness() {
  return {
    ingest: vi.fn<IRagBusiness['ingest']>(),
    delete: vi.fn<IRagBusiness['delete']>(),
    replace: vi.fn<IRagBusiness['replace']>(),
  };
}
