import { describe, expect, it } from 'vitest';
import { toSessionFromRecord, toSessionSummaryFromRecord } from './session.mapper.js';
import type { SessionRecord } from '@/repository/domain/session/session.model.js';

describe('toSessionFromRecord', () => {
  it('maps lastMessage and lastMessageAt from record', () => {
    const record: SessionRecord = {
      id: 'session-1',
      mastraThreadId: 'thread-1',
      userId: 'user-1',
      tenantId: null,
      promptSlug: 'test-prompt',
      resolvedPrompt: 'You are a test assistant.',
      purpose: 'test',
      status: 'active',
      metadata: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      endedAt: null,
      lastMessage: 'Hello world',
      lastMessageAt: new Date('2026-01-01T12:00:00Z'),
    };
    const session = toSessionFromRecord(record);
    expect(session.lastMessage).toBe('Hello world');
    expect(session.lastMessageAt).toEqual(new Date('2026-01-01T12:00:00Z'));
  });

  it('maps null lastMessage and lastMessageAt from record', () => {
    const record: SessionRecord = {
      id: 'session-1',
      mastraThreadId: 'thread-1',
      userId: 'user-1',
      tenantId: null,
      promptSlug: 'test-prompt',
      resolvedPrompt: 'You are a test assistant.',
      purpose: 'test',
      status: 'active',
      metadata: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      endedAt: null,
      lastMessage: null,
      lastMessageAt: null,
    };
    const session = toSessionFromRecord(record);
    expect(session.lastMessage).toBeNull();
    expect(session.lastMessageAt).toBeNull();
  });
});

describe('toSessionSummaryFromRecord', () => {
  it('maps lastMessage and lastMessageAt into summary', () => {
    const record: SessionRecord = {
      id: 'session-1',
      mastraThreadId: 'thread-1',
      userId: 'user-1',
      tenantId: null,
      promptSlug: 'test-prompt',
      resolvedPrompt: 'You are a test assistant.',
      purpose: 'test',
      status: 'active',
      metadata: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      endedAt: null,
      lastMessage: 'Goodbye',
      lastMessageAt: new Date('2026-01-02T00:00:00Z'),
    };
    const summary = toSessionSummaryFromRecord(record);
    expect(summary.lastMessage).toBe('Goodbye');
    expect(summary.lastMessageAt).toEqual(new Date('2026-01-02T00:00:00Z'));
  });
});
