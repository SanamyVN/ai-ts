import { describe, expect, it } from 'vitest';
import { createMockSessionRepository } from './session.testing.js';

describe('SessionDrizzleRepository', () => {
  it('mock factory returns all methods', () => {
    const mock = createMockSessionRepository();
    expect(mock.create).toBeDefined();
    expect(mock.findById).toBeDefined();
    expect(mock.list).toBeDefined();
    expect(mock.updateStatus).toBeDefined();
  });
});
