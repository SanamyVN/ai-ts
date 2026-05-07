import { describe, expect, it } from 'vitest';
import { aiSessionMessages } from './session-message.schema.js';
import type { SessionMessageRepoFilter } from './session-message.interface.js';
import { createMockSessionMessageRepository } from './session-message.testing.js';

describe('aiSessionMessages schema', () => {
  it('table definition exposes all five columns', () => {
    expect(aiSessionMessages.id).toBeDefined();
    expect(aiSessionMessages.sessionId).toBeDefined();
    expect(aiSessionMessages.tenantId).toBeDefined();
    expect(aiSessionMessages.purpose).toBeDefined();
    expect(aiSessionMessages.sentAt).toBeDefined();
  });
});

describe('createMockSessionMessageRepository', () => {
  it('returns stubs for all three interface methods', () => {
    const mock = createMockSessionMessageRepository();
    expect(mock.append).toBeDefined();
    expect(mock.count).toBeDefined();
    expect(mock.countBySession).toBeDefined();
  });
});

describe('SessionMessageRepoFilter shape', () => {
  it('accepts all optional filter fields without type error', () => {
    const filter: SessionMessageRepoFilter = {
      tenantId: 'tenant-1',
      purpose: 'ta-chat:abc',
      purposePrefix: 'ta-chat:',
      sentAtGte: new Date('2026-01-01T00:00:00.000Z'),
      sentAtLt: new Date('2026-02-01T00:00:00.000Z'),
    };
    expect(filter).toBeDefined();
  });
});
