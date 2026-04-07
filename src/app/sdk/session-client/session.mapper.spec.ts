import { describe, expect, it } from 'vitest';
import {
  toSessionClientModelFromBusiness,
  toSessionSummaryClientFromBusiness,
  toMessageListClient,
} from './session.mapper.js';
import type { Session, SessionSummary } from '@/business/domain/session/session.model.js';
import type { MessageList } from '@/business/sdk/mastra/mastra.interface.js';

describe('toSessionClientModelFromBusiness', () => {
  it('maps lastMessage and lastMessageAt from business model', () => {
    const session: Session = {
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

    const result = toSessionClientModelFromBusiness(session);

    expect(result.title).toBe('Session title');
    expect(result.lastMessage).toBe('Hello world');
    expect(result.lastMessageAt).toEqual(new Date('2026-01-01T12:00:00Z'));
  });

  it('maps null lastMessage and lastMessageAt', () => {
    const session: Session = {
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

    const result = toSessionClientModelFromBusiness(session);

    expect(result.title).toBeNull();
    expect(result.lastMessage).toBeNull();
    expect(result.lastMessageAt).toBeNull();
  });
});

describe('toSessionSummaryClientFromBusiness', () => {
  it('maps lastMessage and lastMessageAt from business summary', () => {
    const summary: SessionSummary = {
      id: 'session-1',
      userId: 'user-1',
      promptSlug: 'test-prompt',
      purpose: 'test',
      status: 'active',
      title: 'Summary title',
      startedAt: new Date('2026-01-01T00:00:00Z'),
      lastMessage: 'Goodbye',
      lastMessageAt: new Date('2026-01-02T00:00:00Z'),
    };

    const result = toSessionSummaryClientFromBusiness(summary);

    expect(result.title).toBe('Summary title');
    expect(result.lastMessage).toBe('Goodbye');
    expect(result.lastMessageAt).toEqual(new Date('2026-01-02T00:00:00Z'));
  });

  it('maps null lastMessage and lastMessageAt in summary', () => {
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
    };

    const result = toSessionSummaryClientFromBusiness(summary);

    expect(result.title).toBeNull();
    expect(result.lastMessage).toBeNull();
    expect(result.lastMessageAt).toBeNull();
  });
});

describe('toMessageListClient', () => {
  it('converts a MessageList to MessageListClient', () => {
    const messageList: MessageList = {
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date('2026-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there',
          createdAt: new Date('2026-01-01T10:01:00Z'),
        },
      ],
      page: 1,
      perPage: 20,
    };

    const result = toMessageListClient(messageList);

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toEqual({
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });
    expect(result.messages[1]).toEqual({
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there',
      createdAt: new Date('2026-01-01T10:01:00Z'),
    });
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
  });

  it('returns empty messages array when input has no messages', () => {
    const messageList: MessageList = {
      messages: [],
      page: 1,
      perPage: 10,
    };

    const result = toMessageListClient(messageList);

    expect(result.messages).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(10);
  });
});
