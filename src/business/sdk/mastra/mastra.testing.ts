import { vi } from 'vitest';
import type { IMastraAgent, IMastraMemory } from './mastra.interface.js';

/**
 * Creates a mock `IMastraAgent` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub Mastra agent behavior without a real LLM.
 *
 * @example
 * const agent = createMockMastraAgent();
 * agent.generate.mockResolvedValue({ text: 'hi', threadId: 't1' });
 */
export function createMockMastraAgent() {
  return {
    generate: vi.fn<IMastraAgent['generate']>(),
    stream: vi.fn<IMastraAgent['stream']>(),
  };
}

/**
 * Creates a mock `IMastraMemory` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub memory operations without a real storage backend.
 *
 * @example
 * const memory = createMockMastraMemory();
 * memory.createThread.mockResolvedValue({ id: 't1', resourceId: 'r1' });
 */
export function createMockMastraMemory() {
  return {
    createThread: vi.fn<IMastraMemory['createThread']>(),
    getMessages: vi.fn<IMastraMemory['getMessages']>(),
    listThreads: vi.fn<IMastraMemory['listThreads']>(),
  };
}
