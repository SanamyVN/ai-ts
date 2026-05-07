import { describe, expect, it, beforeEach } from 'vitest';
import { SessionLocalMediator } from './session-local.mediator.js';
import { createMockSessionService } from '@/business/domain/session/session.testing.js';
import { SessionNotFoundError } from '@/business/domain/session/session.error.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import {
  AppendSessionMessageEventCommand,
  CountMessagesByTenantQuery,
  DeleteSessionCommand,
  GetSessionMessagesQuery,
  ListSessionsQuery,
  UpdateSessionTitleCommand,
} from '@/business/domain/session/client/queries.js';

describe('SessionLocalMediator', () => {
  let mediator: SessionLocalMediator;
  let sessionService: ReturnType<typeof createMockSessionService>;

  beforeEach(() => {
    sessionService = createMockSessionService();
    mediator = new SessionLocalMediator(sessionService);
  });

  describe('getMessages', () => {
    it('returns mapped message list from service', async () => {
      sessionService.getMessages.mockResolvedValue({
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Hello',
            createdAt: new Date('2026-01-01T10:00:00Z'),
          },
          {
            id: 'msg-2',
            role: 'assistant' as const,
            content: 'Hi',
            createdAt: new Date('2026-01-01T10:01:00Z'),
          },
        ],
        page: 1,
        perPage: 20,
      });

      const query = new GetSessionMessagesQuery({ sessionId: 'session-1', page: 1, perPage: 20 });
      const result = await mediator.getMessages(query);

      expect(sessionService.getMessages).toHaveBeenCalledWith('session-1', {
        page: 1,
        perPage: 20,
      });
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      });
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(20);
    });

    it('throws SessionNotFoundClientError when service throws SessionNotFoundError', async () => {
      sessionService.getMessages.mockRejectedValue(new SessionNotFoundError('session-missing'));

      const query = new GetSessionMessagesQuery({
        sessionId: 'session-missing',
        page: 1,
        perPage: 10,
      });

      await expect(mediator.getMessages(query)).rejects.toThrow(SessionNotFoundClientError);
    });

    it('re-throws unknown errors', async () => {
      const unknownError = new Error('database connection failed');
      sessionService.getMessages.mockRejectedValue(unknownError);

      const query = new GetSessionMessagesQuery({ sessionId: 'session-1', page: 1, perPage: 10 });

      await expect(mediator.getMessages(query)).rejects.toThrow('database connection failed');
    });
  });

  describe('updateTitle', () => {
    it('delegates title updates to the session service', async () => {
      const command = new UpdateSessionTitleCommand({
        sessionId: 'session-1',
        title: 'Renamed session',
      });

      await mediator.updateTitle(command);

      expect(sessionService.updateTitle).toHaveBeenCalledWith('session-1', 'Renamed session');
    });

    it('maps SessionNotFoundError to SessionNotFoundClientError', async () => {
      sessionService.updateTitle.mockRejectedValue(new SessionNotFoundError('missing'));

      await expect(
        mediator.updateTitle(
          new UpdateSessionTitleCommand({ sessionId: 'missing', title: 'Title' }),
        ),
      ).rejects.toThrow(SessionNotFoundClientError);
    });

    it('re-throws unknown errors', async () => {
      const unknownError = new Error('database connection failed');
      sessionService.updateTitle.mockRejectedValue(unknownError);

      await expect(
        mediator.updateTitle(
          new UpdateSessionTitleCommand({ sessionId: 'session-1', title: 'Title' }),
        ),
      ).rejects.toThrow('database connection failed');
    });
  });

  describe('delete', () => {
    it('delegates permanent deletion to the session service', async () => {
      const command = new DeleteSessionCommand({ sessionId: 'session-1' });

      await mediator.delete(command);

      expect(sessionService.delete).toHaveBeenCalledWith('session-1');
    });

    it('maps SessionNotFoundError to SessionNotFoundClientError', async () => {
      sessionService.delete.mockRejectedValue(new SessionNotFoundError('missing'));

      await expect(
        mediator.delete(new DeleteSessionCommand({ sessionId: 'missing' })),
      ).rejects.toThrow(SessionNotFoundClientError);
    });

    it('re-throws unknown errors', async () => {
      const unknownError = new Error('Mastra unavailable');
      sessionService.delete.mockRejectedValue(unknownError);

      await expect(
        mediator.delete(new DeleteSessionCommand({ sessionId: 'session-1' })),
      ).rejects.toThrow('Mastra unavailable');
    });
  });

  describe('appendMessageEvent', () => {
    it('delegates to sessionService.appendMessageEvent with eventId, sessionId, and sentAt', async () => {
      sessionService.appendMessageEvent.mockResolvedValue(undefined);

      const eventId = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
      const sentAt = new Date('2026-04-01T10:00:00.000Z');
      const command = new AppendSessionMessageEventCommand({
        eventId,
        sessionId: 'session-1',
        sentAt,
      });
      await mediator.appendMessageEvent(command);

      expect(sessionService.appendMessageEvent).toHaveBeenCalledWith(eventId, 'session-1', sentAt);
    });

    it('maps SessionNotFoundError to SessionNotFoundClientError', async () => {
      sessionService.appendMessageEvent.mockRejectedValue(
        new SessionNotFoundError('session-missing'),
      );

      const command = new AppendSessionMessageEventCommand({
        eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        sessionId: 'session-missing',
        sentAt: new Date(),
      });

      await expect(mediator.appendMessageEvent(command)).rejects.toThrow(
        SessionNotFoundClientError,
      );
    });

    it('re-throws unknown errors from the service', async () => {
      sessionService.appendMessageEvent.mockRejectedValue(new Error('DB failure'));

      const command = new AppendSessionMessageEventCommand({
        eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        sessionId: 'session-1',
        sentAt: new Date(),
      });

      await expect(mediator.appendMessageEvent(command)).rejects.toThrow('DB failure');
    });
  });

  describe('countMessagesByTenant', () => {
    it('wraps the bare number from service as { count }', async () => {
      sessionService.countMessagesByTenant.mockResolvedValue(7);

      const query = new CountMessagesByTenantQuery({ tenantId: 'tenant-1' });
      const result = await mediator.countMessagesByTenant(query);

      expect(result).toEqual({ count: 7 });
      expect(sessionService.countMessagesByTenant).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
      });
    });

    it('forwards all filter fields to the service', async () => {
      sessionService.countMessagesByTenant.mockResolvedValue(3);

      const sentAtGte = new Date('2026-04-01T00:00:00Z');
      const sentAtLt = new Date('2026-05-01T00:00:00Z');
      const query = new CountMessagesByTenantQuery({
        tenantId: 'tenant-1',
        purposePrefix: 'ta-',
        sentAtGte,
        sentAtLt,
      });
      const result = await mediator.countMessagesByTenant(query);

      expect(result).toEqual({ count: 3 });
      expect(sessionService.countMessagesByTenant).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        purposePrefix: 'ta-',
        sentAtGte,
        sentAtLt,
      });
    });

    it('wraps count of 0', async () => {
      sessionService.countMessagesByTenant.mockResolvedValue(0);

      const query = new CountMessagesByTenantQuery({ tenantId: 'tenant-1' });
      const result = await mediator.countMessagesByTenant(query);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('list (paginated)', () => {
    it('returns { items, page, perPage } from the service', async () => {
      const summary = {
        id: 'session-1',
        userId: 'user-1',
        promptSlug: 'test-prompt',
        purpose: 'test',
        status: 'active',
        title: null,
        startedAt: new Date('2026-01-01T00:00:00Z'),
        lastMessage: null,
        lastMessageAt: null,
        messageCount: 5,
      };
      sessionService.list.mockResolvedValue([summary]);

      const query = new ListSessionsQuery({ page: 2, perPage: 10, tenantId: 'tenant-1' });
      const result = await mediator.list(query);

      expect(result.page).toBe(2);
      expect(result.perPage).toBe(10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.messageCount).toBe(5);
      expect(sessionService.list).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' }),
        { page: 2, perPage: 10 },
      );
    });

    it('forwards purposePrefix, startedAtGte, startedAtLt to the service', async () => {
      sessionService.list.mockResolvedValue([]);

      const startedAtGte = new Date('2026-04-01T00:00:00Z');
      const startedAtLt = new Date('2026-05-01T00:00:00Z');
      const query = new ListSessionsQuery({
        page: 1,
        perPage: 20,
        purposePrefix: 'ta-',
        startedAtGte,
        startedAtLt,
      });
      await mediator.list(query);

      expect(sessionService.list).toHaveBeenCalledWith(
        { purposePrefix: 'ta-', startedAtGte, startedAtLt },
        { page: 1, perPage: 20 },
      );
    });
  });
});
