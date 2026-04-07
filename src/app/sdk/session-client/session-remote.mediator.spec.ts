import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SessionRemoteMediator, type HttpClient } from './session-remote.mediator.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import {
  DeleteSessionCommand,
  GetSessionMessagesQuery,
  UpdateSessionTitleCommand,
} from '@/business/domain/session/client/queries.js';

describe('SessionRemoteMediator', () => {
  let mediator: SessionRemoteMediator;
  let http: HttpClient;
  const config = { baseUrl: 'https://ai.example.com' };

  beforeEach(() => {
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    mediator = new SessionRemoteMediator(http, config);
  });

  describe('getMessages', () => {
    it('sends GET to correct URL with query params and returns parsed response', async () => {
      vi.mocked(http.get).mockResolvedValue({
        ok: true,
        body: {
          data: {
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
                content: 'Hi',
                createdAt: new Date('2026-01-01T10:01:00Z'),
              },
            ],
            page: 1,
            perPage: 20,
          },
        },
      });

      const query = new GetSessionMessagesQuery({ sessionId: 'session-1', page: 1, perPage: 20 });
      const result = await mediator.getMessages(query);

      expect(http.get).toHaveBeenCalledWith(
        'https://ai.example.com/ai/sessions/session-1/messages?page=1&perPage=20',
      );
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

    it('throws SessionNotFoundClientError on 404', async () => {
      vi.mocked(http.get).mockResolvedValue({ ok: false, status: 404 });

      const query = new GetSessionMessagesQuery({
        sessionId: 'session-missing',
        page: 1,
        perPage: 10,
      });

      await expect(mediator.getMessages(query)).rejects.toThrow(SessionNotFoundClientError);
    });

    it('throws generic error on non-404 failure', async () => {
      vi.mocked(http.get).mockResolvedValue({ ok: false, status: 500 });

      const query = new GetSessionMessagesQuery({ sessionId: 'session-1', page: 1, perPage: 10 });

      await expect(mediator.getMessages(query)).rejects.toThrow(
        'Failed to fetch session messages: 500',
      );
    });
  });

  describe('updateTitle', () => {
    it('sends PATCH to the title endpoint', async () => {
      vi.mocked(http.patch).mockResolvedValue({ ok: true });

      await mediator.updateTitle(
        new UpdateSessionTitleCommand({ sessionId: 'session-1', title: 'Renamed' }),
      );

      expect(http.patch).toHaveBeenCalledWith(
        'https://ai.example.com/ai/sessions/session-1/title',
        { title: 'Renamed' },
      );
    });

    it('maps 404s to SessionNotFoundClientError', async () => {
      vi.mocked(http.patch).mockResolvedValue({ ok: false, status: 404 });

      await expect(
        mediator.updateTitle(
          new UpdateSessionTitleCommand({ sessionId: 'missing', title: 'Renamed' }),
        ),
      ).rejects.toThrow(SessionNotFoundClientError);
    });

    it('throws generic error on non-404 failure', async () => {
      vi.mocked(http.patch).mockResolvedValue({ ok: false, status: 500 });

      await expect(
        mediator.updateTitle(new UpdateSessionTitleCommand({ sessionId: 'session-1', title: 'Renamed' })),
      ).rejects.toThrow('Failed to update session title: 500');
    });
  });

  describe('delete', () => {
    it('sends DELETE to the permanent deletion endpoint', async () => {
      vi.mocked(http.delete).mockResolvedValue({ ok: true });

      await mediator.delete(new DeleteSessionCommand({ sessionId: 'session-1' }));

      expect(http.delete).toHaveBeenCalledWith(
        'https://ai.example.com/ai/sessions/session-1/permanent',
      );
    });

    it('maps 404s to SessionNotFoundClientError', async () => {
      vi.mocked(http.delete).mockResolvedValue({ ok: false, status: 404 });

      await expect(
        mediator.delete(new DeleteSessionCommand({ sessionId: 'missing' })),
      ).rejects.toThrow(SessionNotFoundClientError);
    });

    it('throws generic error on non-404 failure', async () => {
      vi.mocked(http.delete).mockResolvedValue({ ok: false, status: 500 });

      await expect(mediator.delete(new DeleteSessionCommand({ sessionId: 'session-1' }))).rejects.toThrow(
        'Failed to delete session: 500',
      );
    });
  });
});
