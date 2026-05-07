import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SessionRemoteMediator, type HttpClient } from './session-remote.mediator.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import {
  AppendSessionMessageEventCommand,
  CountMessagesByTenantQuery,
  DeleteSessionCommand,
  GetSessionMessagesQuery,
  ListSessionsQuery,
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
        mediator.updateTitle(
          new UpdateSessionTitleCommand({ sessionId: 'session-1', title: 'Renamed' }),
        ),
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

      await expect(
        mediator.delete(new DeleteSessionCommand({ sessionId: 'session-1' })),
      ).rejects.toThrow('Failed to delete session: 500');
    });
  });

  describe('appendMessageEvent', () => {
    it('sends POST to /ai/sessions/:id/message-events with sentAt body and returns void on 204', async () => {
      vi.mocked(http.post).mockResolvedValue({ ok: true, status: 204 });

      const sentAt = new Date('2026-04-01T10:00:00.000Z');
      const command = new AppendSessionMessageEventCommand({
        eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        sessionId: 'session-1',
        sentAt,
      });
      await mediator.appendMessageEvent(command);

      expect(http.post).toHaveBeenCalledWith(
        'https://ai.example.com/ai/sessions/session-1/message-events',
        { eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', sentAt: sentAt.toISOString() },
      );
    });

    it('throws generic error on non-204 failure', async () => {
      vi.mocked(http.post).mockResolvedValue({ ok: false, status: 500 });

      const command = new AppendSessionMessageEventCommand({
        eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        sessionId: 'session-1',
        sentAt: new Date(),
      });

      await expect(mediator.appendMessageEvent(command)).rejects.toThrow(
        'Failed to append message event: 500',
      );
    });
  });

  describe('countMessagesByTenant', () => {
    it('sends GET to /ai/sessions/message-events/count with tenantId query param', async () => {
      vi.mocked(http.get).mockResolvedValue({
        ok: true,
        body: { data: { count: 42 } },
      });

      const query = new CountMessagesByTenantQuery({ tenantId: 'tenant-1' });
      const result = await mediator.countMessagesByTenant(query);

      expect(http.get).toHaveBeenCalledWith(
        'https://ai.example.com/ai/sessions/message-events/count?tenantId=tenant-1',
      );
      expect(result).toEqual({ count: 42 });
    });

    it('serializes Date fields as ISO 8601 strings in the query string', async () => {
      vi.mocked(http.get).mockResolvedValue({
        ok: true,
        body: { data: { count: 3 } },
      });

      const sentAtGte = new Date('2026-04-01T00:00:00.000Z');
      const sentAtLt = new Date('2026-05-01T00:00:00.000Z');
      const query = new CountMessagesByTenantQuery({
        tenantId: 'tenant-1',
        purposePrefix: 'ta-',
        sentAtGte,
        sentAtLt,
      });
      await mediator.countMessagesByTenant(query);

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const call = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(call).toContain('tenantId=tenant-1');
      expect(call).toContain('purposePrefix=ta-');
      expect(call).toContain(`sentAtGte=${encodeURIComponent(sentAtGte.toISOString())}`);
      expect(call).toContain(`sentAtLt=${encodeURIComponent(sentAtLt.toISOString())}`);
    });

    it('throws generic error on failure', async () => {
      vi.mocked(http.get).mockResolvedValue({ ok: false, status: 400 });

      const query = new CountMessagesByTenantQuery({ tenantId: 'tenant-1' });

      await expect(mediator.countMessagesByTenant(query)).rejects.toThrow(
        'Failed to count messages by tenant: 400',
      );
    });
  });

  describe('list (paginated)', () => {
    it('sends GET with page and perPage params and returns { items, page, perPage }', async () => {
      vi.mocked(http.get).mockResolvedValue({
        ok: true,
        body: {
          data: {
            items: [
              {
                id: 'session-1',
                userId: 'user-1',
                promptSlug: 'prompt',
                purpose: 'test',
                status: 'active',
                title: null,
                startedAt: new Date('2026-01-01T00:00:00Z'),
                lastMessage: null,
                lastMessageAt: null,
                messageCount: 5,
              },
            ],
            page: 2,
            perPage: 10,
          },
        },
      });

      const query = new ListSessionsQuery({ page: 2, perPage: 10, tenantId: 'tenant-1' });
      const result = await mediator.list(query);

      expect(result.page).toBe(2);
      expect(result.perPage).toBe(10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.messageCount).toBe(5);

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const call = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(call).toContain('page=2');
      expect(call).toContain('perPage=10');
      expect(call).toContain('tenantId=tenant-1');
    });

    it('serializes startedAtGte and startedAtLt as ISO 8601 in the query string', async () => {
      vi.mocked(http.get).mockResolvedValue({
        ok: true,
        body: { data: { items: [], page: 1, perPage: 20 } },
      });

      const startedAtGte = new Date('2026-04-01T00:00:00.000Z');
      const startedAtLt = new Date('2026-05-01T00:00:00.000Z');
      const query = new ListSessionsQuery({
        page: 1,
        perPage: 20,
        startedAtGte,
        startedAtLt,
      });
      await mediator.list(query);

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const call = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(call).toContain(`startedAtGte=${encodeURIComponent(startedAtGte.toISOString())}`);
      expect(call).toContain(`startedAtLt=${encodeURIComponent(startedAtLt.toISOString())}`);
    });
  });
});
