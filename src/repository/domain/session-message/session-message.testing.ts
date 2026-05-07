import { vi } from 'vitest';
import type { ISessionMessageRepository } from './session-message.interface.js';

/**
 * Creates a fully-typed vi.fn() mock of {@link ISessionMessageRepository}
 * for use in unit tests of business-layer code.
 *
 * Both `append`'s `id` and `sentAt` parameters are required by the interface —
 * callers must supply explicit values (§1 "When sent_at is captured").
 *
 * @example
 * const repo = createMockSessionMessageRepository();
 * repo.count.mockResolvedValue(42);
 */
export function createMockSessionMessageRepository() {
  return {
    append: vi.fn<ISessionMessageRepository['append']>(),
    count: vi.fn<ISessionMessageRepository['count']>(),
    countBySession: vi.fn<ISessionMessageRepository['countBySession']>(),
  };
}
