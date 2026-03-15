import { vi } from 'vitest';
import type { IPromptRepository } from './prompt.interface.js';

export function createMockPromptRepository(): IPromptRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
