// src/business/domain/prompt/prompt.testing.ts
import { vi } from 'vitest';
import type { IPromptService } from './prompt.interface.js';

export function createMockPromptService(): IPromptService {
  return {
    create: vi.fn(),
    getBySlug: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    createVersion: vi.fn(),
    listVersions: vi.fn(),
    setActiveVersion: vi.fn(),
    resolve: vi.fn(),
  };
}
