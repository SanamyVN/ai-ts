import { vi } from 'vitest';
import type { IPromptService } from './prompt.interface.js';

export function createMockPromptService() {
  return {
    create: vi.fn<IPromptService['create']>(),
    getBySlug: vi.fn<IPromptService['getBySlug']>(),
    list: vi.fn<IPromptService['list']>(),
    update: vi.fn<IPromptService['update']>(),
    createVersion: vi.fn<IPromptService['createVersion']>(),
    listVersions: vi.fn<IPromptService['listVersions']>(),
    setActiveVersion: vi.fn<IPromptService['setActiveVersion']>(),
    resolve: vi.fn<IPromptService['resolve']>(),
  };
}
