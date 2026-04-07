import { describe, expect, it, beforeEach } from 'vitest';
import { SessionLocalMediator } from './session-local.mediator.js';
import { createMockSessionService } from '@/business/domain/session/session.testing.js';
import { SessionNotFoundError } from '@/business/domain/session/session.error.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import {
  DeleteSessionCommand,
  GetSessionMessagesQuery,
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
        mediator.updateTitle(new UpdateSessionTitleCommand({ sessionId: 'session-1', title: 'Title' })),
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

      await expect(mediator.delete(new DeleteSessionCommand({ sessionId: 'session-1' }))).rejects.toThrow(
        'Mastra unavailable',
      );
    });
  });
});
