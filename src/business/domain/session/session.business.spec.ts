import { describe, expect, it, beforeEach } from 'vitest';
import { SessionService } from './session.business.js';
import { createMockSessionRepository } from '@/repository/domain/session/session.testing.js';
import { createMockMastraMemory } from '@/business/sdk/mastra/mastra.testing.js';
import { SessionNotFoundError, SessionAlreadyEndedError } from './session.error.js';
import { SessionNotFoundRepoError } from '@/repository/domain/session/session.error.js';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepo: ReturnType<typeof createMockSessionRepository>;
  let mastraMemory: ReturnType<typeof createMockMastraMemory>;

  beforeEach(() => {
    sessionRepo = createMockSessionRepository();
    mastraMemory = createMockMastraMemory();
    service = new SessionService(sessionRepo, mastraMemory);
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
});
