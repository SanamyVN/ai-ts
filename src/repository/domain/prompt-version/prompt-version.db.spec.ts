import { describe, expect, it } from 'vitest';
import { createMockPromptVersionRepository } from './prompt-version.testing.js';

describe('PromptVersionDrizzleRepository', () => {
  it('mock factory returns all methods', () => {
    const mock = createMockPromptVersionRepository();
    expect(mock.create).toBeDefined();
    expect(mock.findById).toBeDefined();
    expect(mock.findActiveByPromptId).toBeDefined();
    expect(mock.listByPromptId).toBeDefined();
    expect(mock.setActive).toBeDefined();
    expect(mock.getNextVersion).toBeDefined();
  });
});
