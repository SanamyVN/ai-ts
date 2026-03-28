import { describe, expect, it, beforeEach } from 'vitest';
import { SessionLocalMediator } from './session-local.mediator.js';
import { createMockSessionService } from '@/business/domain/session/session.testing.js';
import { SessionNotFoundError } from '@/business/domain/session/session.error.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';

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

      const query = { sessionId: 'session-1', page: 1, perPage: 20 };
      const result = await mediator.getMessages(query as never);

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

      const query = { sessionId: 'session-missing', page: 1, perPage: 10 };

      await expect(mediator.getMessages(query as never)).rejects.toThrow(
        SessionNotFoundClientError,
      );
    });

    it('re-throws unknown errors', async () => {
      const unknownError = new Error('database connection failed');
      sessionService.getMessages.mockRejectedValue(unknownError);

      const query = { sessionId: 'session-1', page: 1, perPage: 10 };

      await expect(mediator.getMessages(query as never)).rejects.toThrow(
        'database connection failed',
      );
    });
  });
});
