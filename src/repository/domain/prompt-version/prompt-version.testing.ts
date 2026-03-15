import { vi } from 'vitest';
import type { IPromptVersionRepository } from './prompt-version.interface.js';

export function createMockPromptVersionRepository() {
  return {
    create: vi.fn<IPromptVersionRepository['create']>(),
    findById: vi.fn<IPromptVersionRepository['findById']>(),
    findActiveByPromptId: vi.fn<IPromptVersionRepository['findActiveByPromptId']>(),
    listByPromptId: vi.fn<IPromptVersionRepository['listByPromptId']>(),
    setActive: vi.fn<IPromptVersionRepository['setActive']>(),
    getNextVersion: vi.fn<IPromptVersionRepository['getNextVersion']>(),
  };
}
