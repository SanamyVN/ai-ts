import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { pg } from '../fixture.js';
import { createAiTestContext, type AiTestContext } from '../helpers.js';
import {
  SessionNotFoundError,
  SessionAlreadyEndedError,
} from '@/business/domain/session/session.error.js';

describe('Session / Lifecycle', () => {
  let ctx: AiTestContext;

  beforeAll(async () => {
    await pg.start();
  });

  afterAll(async () => {
    await pg.stop();
  });

  beforeEach(() => {
    ctx = createAiTestContext();
  });

  afterEach(async () => {
    await pg.truncateAll();
  });

  it('starts a session with Mastra thread creation', async () => {
    ctx.mastraMemory.createThread.mockResolvedValue({
      id: 'thread-123',
      resourceId: 'user-1',
    });

    const session = await ctx.sessionService.start({
      userId: 'user-1',
      promptSlug: 'test-prompt',
      purpose: 'testing',
    });

    expect(session.id).toBeDefined();
    expect(session.mastraThreadId).toBe('thread-123');
    expect(session.userId).toBe('user-1');
    expect(session.status).toBe('active');
    expect(ctx.mastraMemory.createThread).toHaveBeenCalledWith('user-1');
  });

  it('gets messages via Mastra memory', async () => {
    ctx.mastraMemory.createThread.mockResolvedValue({
      id: 'thread-123',
      resourceId: 'user-1',
    });
    const session = await ctx.sessionService.start({
      userId: 'user-1',
      promptSlug: 'test-prompt',
      purpose: 'testing',
    });

    ctx.mastraMemory.getMessages.mockResolvedValue({
      messages: [
        { id: 'm1', role: 'user', content: 'Hello', createdAt: new Date() },
        { id: 'm2', role: 'assistant', content: 'Hi there!', createdAt: new Date() },
      ],
      page: 1,
      perPage: 10,
    });

    const result = await ctx.sessionService.getMessages(session.id, { page: 1, perPage: 10 });

    expect(result.messages).toHaveLength(2);
    expect(ctx.mastraMemory.getMessages).toHaveBeenCalledWith('thread-123', {
      page: 1,
      perPage: 10,
    });
  });

  it('pauses an active session', async () => {
    ctx.mastraMemory.createThread.mockResolvedValue({
      id: 'thread-pause',
      resourceId: 'user-2',
    });
    const session = await ctx.sessionService.start({
      userId: 'user-2',
      promptSlug: 'test-prompt',
      purpose: 'testing',
    });

    await ctx.sessionService.pause(session.id);

    const updated = await ctx.sessionService.get(session.id);
    expect(updated.status).toBe('paused');
  });

  it('resumes a paused session', async () => {
    ctx.mastraMemory.createThread.mockResolvedValue({
      id: 'thread-resume',
      resourceId: 'user-3',
    });
    const session = await ctx.sessionService.start({
      userId: 'user-3',
      promptSlug: 'test-prompt',
      purpose: 'testing',
    });
    await ctx.sessionService.pause(session.id);

    const resumed = await ctx.sessionService.resume(session.id);

    expect(resumed.status).toBe('active');
  });

  it('ends a session and sets endedAt', async () => {
    ctx.mastraMemory.createThread.mockResolvedValue({
      id: 'thread-end',
      resourceId: 'user-4',
    });
    const session = await ctx.sessionService.start({
      userId: 'user-4',
      promptSlug: 'test-prompt',
      purpose: 'testing',
    });

    await ctx.sessionService.end(session.id);

    const ended = await ctx.sessionService.get(session.id);
    expect(ended.status).toBe('ended');
    expect(ended.endedAt).not.toBeNull();
    expect(ended.endedAt).toBeInstanceOf(Date);
  });

  it('throws SessionAlreadyEndedError when ending an already-ended session', async () => {
    ctx.mastraMemory.createThread.mockResolvedValue({
      id: 'thread-double-end',
      resourceId: 'user-5',
    });
    const session = await ctx.sessionService.start({
      userId: 'user-5',
      promptSlug: 'test-prompt',
      purpose: 'testing',
    });
    await ctx.sessionService.end(session.id);

    await expect(ctx.sessionService.end(session.id)).rejects.toThrow(SessionAlreadyEndedError);
  });

  it('throws SessionNotFoundError when getting a non-existent session', async () => {
    await expect(ctx.sessionService.get('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      SessionNotFoundError,
    );
  });

  it('exports transcript in JSON format', async () => {
    ctx.mastraMemory.createThread.mockResolvedValue({
      id: 'thread-export-json',
      resourceId: 'user-6',
    });
    const session = await ctx.sessionService.start({
      userId: 'user-6',
      promptSlug: 'test-prompt',
      purpose: 'testing',
    });

    const messages = [
      { id: 'm1', role: 'user' as const, content: 'Hello', createdAt: new Date() },
      { id: 'm2', role: 'assistant' as const, content: 'Hi there!', createdAt: new Date() },
    ];
    ctx.mastraMemory.getMessages.mockResolvedValue({
      messages,
      page: 1,
      perPage: 10000,
    });

    const transcript = await ctx.sessionService.exportTranscript(session.id, 'json');

    expect(transcript.sessionId).toBe(session.id);
    expect(transcript.format).toBe('json');
    expect(transcript.messages).toHaveLength(2);
    const parsed = JSON.parse(transcript.content) as unknown[];
    expect(parsed).toHaveLength(2);
  });

  it('exports transcript in text format', async () => {
    ctx.mastraMemory.createThread.mockResolvedValue({
      id: 'thread-export-text',
      resourceId: 'user-7',
    });
    const session = await ctx.sessionService.start({
      userId: 'user-7',
      promptSlug: 'test-prompt',
      purpose: 'testing',
    });

    ctx.mastraMemory.getMessages.mockResolvedValue({
      messages: [
        { id: 'm1', role: 'user', content: 'Hello', createdAt: new Date() },
        { id: 'm2', role: 'assistant', content: 'Hi there!', createdAt: new Date() },
      ],
      page: 1,
      perPage: 10000,
    });

    const transcript = await ctx.sessionService.exportTranscript(session.id, 'text');

    expect(transcript.sessionId).toBe(session.id);
    expect(transcript.format).toBe('text');
    expect(transcript.content).toContain('[user] Hello');
    expect(transcript.content).toContain('[assistant] Hi there!');
  });
});
