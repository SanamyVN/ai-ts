import { vi } from 'vitest';
import type { IPromptVersionRepository } from './prompt-version.interface.js';

export function createMockPromptVersionRepository(): IPromptVersionRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findActiveByPromptId: vi.fn(),
    listByPromptId: vi.fn(),
    setActive: vi.fn(),
    getNextVersion: vi.fn(),
  };
}
