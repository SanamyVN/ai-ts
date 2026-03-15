import { vi } from 'vitest';
import type { IPromptRepository } from './prompt.interface.js';

export function createMockPromptRepository() {
  return {
    create: vi.fn<IPromptRepository['create']>(),
    findById: vi.fn<IPromptRepository['findById']>(),
    findBySlug: vi.fn<IPromptRepository['findBySlug']>(),
    list: vi.fn<IPromptRepository['list']>(),
    update: vi.fn<IPromptRepository['update']>(),
    delete: vi.fn<IPromptRepository['delete']>(),
  };
}
