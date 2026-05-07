import { describe, expect, it } from 'vitest';
import { aiSessionMessages } from './session-message.schema.js';

describe('aiSessionMessages schema', () => {
  it('table definition exposes all five columns', () => {
    expect(aiSessionMessages.id).toBeDefined();
    expect(aiSessionMessages.sessionId).toBeDefined();
    expect(aiSessionMessages.tenantId).toBeDefined();
    expect(aiSessionMessages.purpose).toBeDefined();
    expect(aiSessionMessages.sentAt).toBeDefined();
  });
});
