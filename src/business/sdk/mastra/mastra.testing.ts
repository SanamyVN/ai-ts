import { vi } from 'vitest';
import type { IMastraAgent, IMastraMemory } from './mastra.interface.js';

/**
 * Creates a mock `IMastraAgent` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub Mastra agent behavior without a real LLM.
 *
 * @example
 * const agent = createMockMastraAgent();
 * vi.mocked(agent.generate).mockResolvedValue({ text: 'hi', threadId: 't1' });
 */
export function createMockMastraAgent(): IMastraAgent {
  return {
    generate: vi.fn(),
    stream: vi.fn(),
  };
}

/**
 * Creates a mock `IMastraMemory` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub memory operations without a real storage backend.
 *
 * @example
 * const memory = createMockMastraMemory();
 * vi.mocked(memory.createThread).mockResolvedValue({ id: 't1', resourceId: 'r1' });
 */
export function createMockMastraMemory(): IMastraMemory {
  return {
    createThread: vi.fn(),
    getMessages: vi.fn(),
    listThreads: vi.fn(),
  };
}
