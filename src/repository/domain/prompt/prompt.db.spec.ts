import { describe, expect, it } from 'vitest';
import { createMockPromptRepository } from './prompt.testing.js';

describe('PromptDrizzleRepository', () => {
  it('mock factory returns all methods', () => {
    const mock = createMockPromptRepository();
    expect(mock.create).toBeDefined();
    expect(mock.findById).toBeDefined();
    expect(mock.findBySlug).toBeDefined();
    expect(mock.list).toBeDefined();
    expect(mock.update).toBeDefined();
    expect(mock.delete).toBeDefined();
  });
});
