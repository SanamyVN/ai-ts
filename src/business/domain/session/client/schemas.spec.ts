import { describe, expect, it } from 'vitest';
import { sessionClientModelSchema, sessionSummaryClientSchema } from './schemas.js';

describe('session client schemas', () => {
  it('parses a full session client model with title', () => {
    const result = sessionClientModelSchema.parse({
      id: 'session-1',
      mastraThreadId: 'thread-1',
      userId: 'user-1',
      tenantId: null,
      promptSlug: 'prompt',
      resolvedPrompt: 'Resolved prompt',
      purpose: 'support',
      status: 'active',
      title: 'Session title',
      metadata: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      endedAt: null,
      lastMessage: null,
      lastMessageAt: null,
    });

    expect(result.title).toBe('Session title');
  });

  it('parses a session summary client with nullable title', () => {
    const result = sessionSummaryClientSchema.parse({
      id: 'session-1',
      userId: 'user-1',
      promptSlug: 'prompt',
      purpose: 'support',
      status: 'active',
      title: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      lastMessage: null,
      lastMessageAt: null,
    });

    expect(result.title).toBeNull();
  });
});
