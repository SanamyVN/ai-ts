import { vi } from 'vitest';
import type { ISessionRepository } from './session.interface.js';

export function createMockSessionRepository() {
  return {
    create: vi.fn<ISessionRepository['create']>(),
    findById: vi.fn<ISessionRepository['findById']>(),
    list: vi.fn<ISessionRepository['list']>(),
    updateStatus: vi.fn<ISessionRepository['updateStatus']>(),
    updateResolvedPrompt: vi.fn<ISessionRepository['updateResolvedPrompt']>(),
    updateLastMessage: vi.fn<ISessionRepository['updateLastMessage']>(),
    updateTitle: vi.fn<ISessionRepository['updateTitle']>(),
    deleteById: vi.fn<ISessionRepository['deleteById']>(),
  };
}
