import { describe, expect, it } from 'vitest';
import { toSessionFromRecord, toSessionSummaryFromRecord } from './session.mapper.js';
import type { SessionRecord } from '@/repository/domain/session/session.model.js';
import type { SessionSummary } from './session.model.js';

describe('toSessionFromRecord', () => {
  it('maps title, lastMessage, and lastMessageAt from record', () => {
    const record: SessionRecord = {
      id: 'session-1',
      mastraThreadId: 'thread-1',
      userId: 'user-1',
      tenantId: null,
      promptSlug: 'test-prompt',
      resolvedPrompt: 'You are a test assistant.',
      purpose: 'test',
      status: 'active',
      title: 'Session title',
      metadata: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      endedAt: null,
      lastMessage: 'Hello world',
      lastMessageAt: new Date('2026-01-01T12:00:00Z'),
    };
    const session = toSessionFromRecord(record);
    expect(session.title).toBe('Session title');
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
      title: null,
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
  it('maps title, lastMessage, and lastMessageAt into summary', () => {
    const record: SessionRecord = {
      id: 'session-1',
      mastraThreadId: 'thread-1',
      userId: 'user-1',
      tenantId: null,
      promptSlug: 'test-prompt',
      resolvedPrompt: 'You are a test assistant.',
      purpose: 'test',
      status: 'active',
      title: 'Summary title',
      metadata: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      endedAt: null,
      lastMessage: 'Goodbye',
      lastMessageAt: new Date('2026-01-02T00:00:00Z'),
    };
    const summary = toSessionSummaryFromRecord(record, 0);
    expect(summary.title).toBe('Summary title');
    expect(summary.lastMessage).toBe('Goodbye');
    expect(summary.lastMessageAt).toEqual(new Date('2026-01-02T00:00:00Z'));
  });

  it('projects messageCount: 0 when called with count 0', () => {
    const record: SessionRecord = {
      id: 'session-1',
      mastraThreadId: 'thread-1',
      userId: 'user-1',
      tenantId: null,
      promptSlug: 'test-prompt',
      resolvedPrompt: 'You are a test assistant.',
      purpose: 'test',
      status: 'active',
      title: null,
      metadata: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      endedAt: null,
      lastMessage: null,
      lastMessageAt: null,
    };
    const summary = toSessionSummaryFromRecord(record, 0);
    expect(summary.messageCount).toBe(0);
  });

  it('projects messageCount: 42 when called with count 42', () => {
    const record: SessionRecord = {
      id: 'session-2',
      mastraThreadId: 'thread-2',
      userId: 'user-1',
      tenantId: null,
      promptSlug: 'test-prompt',
      resolvedPrompt: 'You are a test assistant.',
      purpose: 'test',
      status: 'active',
      title: null,
      metadata: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      endedAt: null,
      lastMessage: null,
      lastMessageAt: null,
    };
    const summary = toSessionSummaryFromRecord(record, 42);
    expect(summary.messageCount).toBe(42);
  });
});

describe('SessionSummary shape', () => {
  it('includes messageCount field (compile-time contract check)', () => {
    // This test fails at the TypeScript level until session.model.ts is updated.
    // The runtime assertion is a no-op; the meaningful check is `pnpm tsc --noEmit`.
    const summary: SessionSummary = {
      id: 'session-1',
      userId: 'user-1',
      promptSlug: 'test-prompt',
      purpose: 'test',
      status: 'active',
      title: null,
      startedAt: new Date('2026-01-01T00:00:00Z'),
      lastMessage: null,
      lastMessageAt: null,
      messageCount: 0,
    };
    expect(summary.messageCount).toBe(0);
  });
});
