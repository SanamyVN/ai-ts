import { vi } from 'vitest';
import type { ISessionRepository } from './session.interface.js';

export function createMockSessionRepository(): ISessionRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    updateStatus: vi.fn(),
  };
}
