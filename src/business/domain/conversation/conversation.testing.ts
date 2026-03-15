import { vi } from 'vitest';
import type { IConversationEngine } from './conversation.interface.js';

/**
 * Creates a mock `IConversationEngine` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub conversation engine behavior without real infrastructure.
 *
 * @example
 * const engine = createMockConversationEngine();
 * engine.create.mockResolvedValue({ id: 'c1', sessionId: 's1', promptSlug: 'greet', resolvedPrompt: 'Hi', model: 'gpt-4' });
 */
export function createMockConversationEngine() {
  return {
    create: vi.fn<IConversationEngine['create']>(),
    send: vi.fn<IConversationEngine['send']>(),
    stream: vi.fn<IConversationEngine['stream']>(),
  };
}
