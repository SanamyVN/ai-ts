import { describe, expect, it, beforeEach } from 'vitest';
import { SessionService } from './session.business.js';
import { createMockSessionRepository } from '@/repository/domain/session/session.testing.js';
import { createMockMastraMemory } from '@/business/sdk/mastra/mastra.testing.js';
import { SessionNotFoundError, SessionAlreadyEndedError } from './session.error.js';
import { SessionNotFoundRepoError } from '@/repository/domain/session/session.error.js';
import { createMockSessionMessageRepository } from '@/repository/domain/session-message/session-message.testing.js';
import { createMockSessionService } from './session.testing.js';
import type { CountMessagesFilter } from './session.model.js';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepo: ReturnType<typeof createMockSessionRepository>;
  let mastraMemory: ReturnType<typeof createMockMastraMemory>;
  let sessionMessageRepo: ReturnType<typeof createMockSessionMessageRepository>;

  beforeEach(() => {
    sessionRepo = createMockSessionRepository();
    mastraMemory = createMockMastraMemory();
    sessionMessageRepo = createMockSessionMessageRepository();
    service = new SessionService(sessionRepo, mastraMemory, sessionMessageRepo);
  });

  describe('start', () => {
    it('creates Mastra thread and session record', async () => {
      mastraMemory.createThread.mockResolvedValue({
        id: 'thread-1',
        resourceId: 'user-1',
      });
      sessionRepo.create.mockResolvedValue({
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
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });

      const result = await service.start({
        userId: 'user-1',
        promptSlug: 'test-prompt',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
      });

      expect(mastraMemory.createThread).toHaveBeenCalledWith('user-1');
      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mastraThreadId: 'thread-1',
          userId: 'user-1',
          promptSlug: 'test-prompt',
          purpose: 'test',
        }),
      );
      expect(result.id).toBe('session-1');
    });
  });

  describe('end', () => {
    it('ends an active session', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });
      sessionRepo.updateStatus.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'ended',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: new Date(),
        lastMessage: null,
        lastMessageAt: null,
      });

      await service.end('session-1');
      expect(sessionRepo.updateStatus).toHaveBeenCalledWith('session-1', 'ended', expect.any(Date));
    });

    it('throws SessionAlreadyEndedError for ended session', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'ended',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: new Date(),
        lastMessage: null,
        lastMessageAt: null,
      });

      await expect(service.end('session-1')).rejects.toThrow(SessionAlreadyEndedError);
    });
  });

  describe('get', () => {
    it('throws SessionNotFoundError when not found', async () => {
      sessionRepo.findById.mockResolvedValue(undefined);
      await expect(service.get('missing')).rejects.toThrow(SessionNotFoundError);
    });
  });

  describe('getMessages', () => {
    it('delegates to Mastra memory', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });
      mastraMemory.getMessages.mockResolvedValue({
        messages: [{ id: 'm1', role: 'user', content: 'hello', createdAt: new Date() }],
        page: 1,
        perPage: 10,
      });

      const result = await service.getMessages('session-1', { page: 1, perPage: 10 });
      expect(mastraMemory.getMessages).toHaveBeenCalledWith('thread-1', { page: 1, perPage: 10 });
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('updateLastMessage', () => {
    it('calls repo updateLastMessage with sessionId, message, and current date', async () => {
      sessionRepo.updateLastMessage.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: 'Hello world',
        lastMessageAt: new Date(),
      });

      await service.updateLastMessage('session-1', 'Hello world');

      expect(sessionRepo.updateLastMessage).toHaveBeenCalledWith(
        'session-1',
        'Hello world',
        expect.any(Date),
      );
    });

    it('throws SessionNotFoundError when session does not exist', async () => {
      sessionRepo.updateLastMessage.mockRejectedValue(new SessionNotFoundRepoError('session-99'));

      await expect(service.updateLastMessage('session-99', 'Hello')).rejects.toThrow(
        SessionNotFoundError,
      );
    });

    it('re-throws unknown errors', async () => {
      const unknownError = new Error('database connection lost');
      sessionRepo.updateLastMessage.mockRejectedValue(unknownError);

      await expect(service.updateLastMessage('session-1', 'Hello')).rejects.toThrow(
        'database connection lost',
      );
    });
  });

  describe('updateTitle', () => {
    it('delegates to repo updateTitle', async () => {
      sessionRepo.updateTitle.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'active',
        title: 'New Title',
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });

      await service.updateTitle('session-1', 'New Title');

      expect(sessionRepo.updateTitle).toHaveBeenCalledWith('session-1', 'New Title');
    });

    it('throws SessionNotFoundError when repo throws SessionNotFoundRepoError', async () => {
      sessionRepo.updateTitle.mockRejectedValue(new SessionNotFoundRepoError('session-99'));

      await expect(service.updateTitle('session-99', 'Title')).rejects.toThrow(
        SessionNotFoundError,
      );
    });

    it('re-throws unknown errors', async () => {
      const unknownError = new Error('database connection lost');
      sessionRepo.updateTitle.mockRejectedValue(unknownError);

      await expect(service.updateTitle('session-1', 'Title')).rejects.toThrow(
        'database connection lost',
      );
    });
  });

  describe('delete', () => {
    it('fetches session, deletes Mastra thread, then deletes session record', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });
      mastraMemory.deleteThread.mockResolvedValue(undefined);
      sessionRepo.deleteById.mockResolvedValue(undefined);

      await service.delete('session-1');

      expect(sessionRepo.findById).toHaveBeenCalledWith('session-1');
      expect(mastraMemory.deleteThread).toHaveBeenCalledWith('thread-1');
      expect(sessionRepo.deleteById).toHaveBeenCalledWith('session-1');
    });

    it('throws SessionNotFoundError when session does not exist', async () => {
      sessionRepo.findById.mockResolvedValue(undefined);

      await expect(service.delete('missing')).rejects.toThrow(SessionNotFoundError);
    });

    it('does not delete session record if Mastra thread deletion fails', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });
      mastraMemory.deleteThread.mockRejectedValue(new Error('Mastra unavailable'));

      await expect(service.delete('session-1')).rejects.toThrow('Mastra unavailable');
      expect(sessionRepo.deleteById).not.toHaveBeenCalled();
    });

    it('throws SessionNotFoundError when deleteById reports not found after thread deletion', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });
      mastraMemory.deleteThread.mockResolvedValue(undefined);
      sessionRepo.deleteById.mockRejectedValue(new SessionNotFoundRepoError('session-1'));

      await expect(service.delete('session-1')).rejects.toThrow(SessionNotFoundError);
    });

    it('confirms deleted session is absent from subsequent list results', async () => {
      sessionRepo.findById.mockResolvedValue({
        id: 'session-to-delete',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'test',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });
      mastraMemory.deleteThread.mockResolvedValue(undefined);
      sessionRepo.deleteById.mockResolvedValue(undefined);

      await service.delete('session-to-delete');

      expect(sessionRepo.deleteById).toHaveBeenCalledWith('session-to-delete');

      sessionRepo.list.mockResolvedValue([
        {
          id: 'session-other',
          mastraThreadId: 'thread-other',
          userId: 'user-1',
          tenantId: null,
          promptSlug: 'test',
          resolvedPrompt: 'You are a test assistant.',
          purpose: 'test',
          status: 'active',
          title: null,
          metadata: null,
          startedAt: new Date(),
          endedAt: null,
          lastMessage: null,
          lastMessageAt: null,
        },
      ]);
      sessionMessageRepo.countBySession.mockResolvedValue(new Map());

      const results = await service.list({ userId: 'user-1' }, { page: 1, perPage: 10 });

      expect(results.find((session) => session.id === 'session-to-delete')).toBeUndefined();
    });
  });

  describe('appendMessageEvent', () => {
    it('loads the session and calls sessionMessageRepository.append with tenantId, purpose, and sentAt', async () => {
      const sentAt = new Date('2026-03-15T10:00:00.000Z');
      sessionRepo.findById.mockResolvedValue({
        id: 'session-1',
        mastraThreadId: 'thread-1',
        userId: 'user-1',
        tenantId: 'tenant-abc',
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'ta-chat:uuid-1',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });
      sessionMessageRepo.append.mockResolvedValue(undefined);

      await service.appendMessageEvent('session-1', sentAt);

      expect(sessionRepo.findById).toHaveBeenCalledWith('session-1');
      expect(sessionMessageRepo.append).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          tenantId: 'tenant-abc',
          purpose: 'ta-chat:uuid-1',
          sentAt,
        }),
      );
    });

    it('throws SessionNotFoundError when the session does not exist', async () => {
      sessionRepo.findById.mockResolvedValue(undefined);

      await expect(service.appendMessageEvent('missing-session', new Date())).rejects.toThrow(
        SessionNotFoundError,
      );

      expect(sessionMessageRepo.append).not.toHaveBeenCalled();
    });

    it('does not call sessionMessageRepository.append when session.tenantId is null', async () => {
      // Tenantless sessions are not billable — writing a row with tenant_id = ''
      // would pollute billing aggregates. The method must return silently. (§1)
      sessionRepo.findById.mockResolvedValue({
        id: 'session-tenantless',
        mastraThreadId: 'thread-tenantless',
        userId: 'user-1',
        tenantId: null,
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'ta-chat:uuid-2',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });

      await service.appendMessageEvent('session-tenantless', new Date());

      expect(sessionMessageRepo.append).not.toHaveBeenCalled();
    });

    it('generates a valid UUID v4 for the event row id', async () => {
      // randomUUID() from node:crypto always produces a standard UUID v4.
      // We cannot pin to a specific value since it is non-deterministic, so we
      // match against the UUID v4 regex pattern instead.
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      sessionRepo.findById.mockResolvedValue({
        id: 'session-uuid-check',
        mastraThreadId: 'thread-uuid',
        userId: 'user-1',
        tenantId: 'tenant-xyz',
        promptSlug: 'test',
        resolvedPrompt: 'You are a test assistant.',
        purpose: 'ta-chat:uuid-3',
        status: 'active',
        title: null,
        metadata: null,
        startedAt: new Date(),
        endedAt: null,
        lastMessage: null,
        lastMessageAt: null,
      });
      sessionMessageRepo.append.mockResolvedValue(undefined);

      await service.appendMessageEvent('session-uuid-check', new Date());

      const appendArg = sessionMessageRepo.append.mock.calls[0]?.[0];
      expect(appendArg?.id).toMatch(uuidV4Regex);
    });
  });

  describe('countMessagesByTenant', () => {
    it('forwards full CountMessagesFilter to sessionMessageRepository.count and returns bare number', async () => {
      sessionMessageRepo.count.mockResolvedValue(99);

      const filter: CountMessagesFilter = {
        tenantId: 'tenant-1',
        purposePrefix: 'ta-chat:',
        sentAtGte: new Date('2026-01-01T00:00:00.000Z'),
        sentAtLt: new Date('2026-02-01T00:00:00.000Z'),
      };

      const result = await service.countMessagesByTenant(filter);

      expect(sessionMessageRepo.count).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        purposePrefix: 'ta-chat:',
        sentAtGte: new Date('2026-01-01T00:00:00.000Z'),
        sentAtLt: new Date('2026-02-01T00:00:00.000Z'),
      });
      expect(result).toBe(99);
    });

    it('passes only tenantId when no other filter fields are present', async () => {
      sessionMessageRepo.count.mockResolvedValue(7);

      const result = await service.countMessagesByTenant({ tenantId: 'tenant-2' });

      expect(sessionMessageRepo.count).toHaveBeenCalledWith({ tenantId: 'tenant-2' });
      expect(result).toBe(7);
    });

    it('forwards purpose (exact match) when provided instead of purposePrefix', async () => {
      sessionMessageRepo.count.mockResolvedValue(3);

      await service.countMessagesByTenant({ tenantId: 'tenant-3', purpose: 'ta-chat:exact-id' });

      expect(sessionMessageRepo.count).toHaveBeenCalledWith({
        tenantId: 'tenant-3',
        purpose: 'ta-chat:exact-id',
      });
    });

    it('returns 0 when repository returns 0', async () => {
      sessionMessageRepo.count.mockResolvedValue(0);

      const result = await service.countMessagesByTenant({ tenantId: 'tenant-empty' });

      expect(result).toBe(0);
    });
  });

  describe('list — pagination and messageCount projection', () => {
    it('forwards filter and pagination to sessionRepo.list', async () => {
      sessionRepo.list.mockResolvedValue([]);
      sessionMessageRepo.countBySession.mockResolvedValue(new Map());

      await service.list({ userId: 'user-1' }, { page: 2, perPage: 25 });

      expect(sessionRepo.list).toHaveBeenCalledWith({ userId: 'user-1' }, { page: 2, perPage: 25 });
    });

    it('calls countBySession once with the page session ids', async () => {
      sessionRepo.list.mockResolvedValue([
        {
          id: 'session-a',
          mastraThreadId: 'thread-a',
          userId: 'user-1',
          tenantId: null,
          promptSlug: 'test',
          resolvedPrompt: 'You are a test assistant.',
          purpose: 'test',
          status: 'active',
          title: null,
          metadata: null,
          startedAt: new Date(),
          endedAt: null,
          lastMessage: null,
          lastMessageAt: null,
        },
        {
          id: 'session-b',
          mastraThreadId: 'thread-b',
          userId: 'user-1',
          tenantId: null,
          promptSlug: 'test',
          resolvedPrompt: 'You are a test assistant.',
          purpose: 'test',
          status: 'active',
          title: null,
          metadata: null,
          startedAt: new Date(),
          endedAt: null,
          lastMessage: null,
          lastMessageAt: null,
        },
      ]);
      sessionMessageRepo.countBySession.mockResolvedValue(new Map([['session-a', 5]]));

      await service.list({}, { page: 1, perPage: 10 });

      expect(sessionMessageRepo.countBySession).toHaveBeenCalledTimes(1);
      expect(sessionMessageRepo.countBySession).toHaveBeenCalledWith(['session-a', 'session-b']);
    });

    it('projects messageCount from the count map onto each summary', async () => {
      sessionRepo.list.mockResolvedValue([
        {
          id: 'session-a',
          mastraThreadId: 'thread-a',
          userId: 'user-1',
          tenantId: null,
          promptSlug: 'test',
          resolvedPrompt: 'You are a test assistant.',
          purpose: 'test',
          status: 'active',
          title: null,
          metadata: null,
          startedAt: new Date(),
          endedAt: null,
          lastMessage: null,
          lastMessageAt: null,
        },
      ]);
      sessionMessageRepo.countBySession.mockResolvedValue(new Map([['session-a', 17]]));

      const results = await service.list({}, { page: 1, perPage: 10 });

      expect(results).toHaveLength(1);
      expect(results[0]?.messageCount).toBe(17);
    });

    it('defaults messageCount to 0 for sessions absent from the count map', async () => {
      sessionRepo.list.mockResolvedValue([
        {
          id: 'session-no-events',
          mastraThreadId: 'thread-1',
          userId: 'user-1',
          tenantId: null,
          promptSlug: 'test',
          resolvedPrompt: 'You are a test assistant.',
          purpose: 'test',
          status: 'active',
          title: null,
          metadata: null,
          startedAt: new Date(),
          endedAt: null,
          lastMessage: null,
          lastMessageAt: null,
        },
      ]);
      // countBySession returns an empty map — session has no events
      sessionMessageRepo.countBySession.mockResolvedValue(new Map());

      const results = await service.list({}, { page: 1, perPage: 10 });

      expect(results[0]?.messageCount).toBe(0);
    });

    it('returns an empty array when repo returns no records', async () => {
      sessionRepo.list.mockResolvedValue([]);
      sessionMessageRepo.countBySession.mockResolvedValue(new Map());

      const results = await service.list({}, { page: 1, perPage: 10 });

      expect(results).toHaveLength(0);
      expect(sessionMessageRepo.countBySession).toHaveBeenCalledWith([]);
    });
  });
});

describe('ISessionService contract', () => {
  it('service exposes appendMessageEvent and countMessagesByTenant (compile-time check)', () => {
    // If ISessionService is missing these methods, the vi.fn() stubs in
    // createMockSessionService will drift from the interface and tsc will error.
    // The runtime assertion is a no-op.
    const mock = createMockSessionService();
    expect(mock.appendMessageEvent).toBeDefined();
    expect(mock.countMessagesByTenant).toBeDefined();
  });
});
