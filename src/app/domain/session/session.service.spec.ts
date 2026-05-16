import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionAppService } from './session.service.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import {
  AppendSessionMessageEventCommand,
  CountMessagesQuery,
  DeleteSessionCommand,
  ListSessionsQuery,
  UpdateSessionTitleCommand,
} from '@/business/domain/session/client/queries.js';
import { SessionNotFoundHttpError } from './session.error.js';

describe('SessionAppService', () => {
  let mediator: { send: ReturnType<typeof vi.fn> };
  let service: SessionAppService;

  beforeEach(() => {
    mediator = { send: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    service = new SessionAppService(mediator as never);
  });

  describe('updateTitle', () => {
    it('dispatches UpdateSessionTitleCommand', async () => {
      await service.updateTitle('session-1', 'Renamed');

      expect(mediator.send).toHaveBeenCalledWith(expect.any(UpdateSessionTitleCommand));
    });

    it('maps client not found errors to HTTP errors', async () => {
      mediator.send.mockRejectedValueOnce(new SessionNotFoundClientError('missing'));

      await expect(service.updateTitle('missing', 'Renamed')).rejects.toThrow(
        SessionNotFoundHttpError,
      );
    });
  });

  describe('delete', () => {
    it('dispatches DeleteSessionCommand', async () => {
      await service.delete('session-1');

      expect(mediator.send).toHaveBeenCalledWith(expect.any(DeleteSessionCommand));
    });

    it('maps client not found errors to HTTP errors', async () => {
      mediator.send.mockRejectedValueOnce(new SessionNotFoundClientError('missing'));

      await expect(service.delete('missing')).rejects.toThrow(SessionNotFoundHttpError);
    });
  });

  describe('list', () => {
    it('dispatches ListSessionsQuery with page and perPage and returns { items, page, perPage, total }', async () => {
      mediator.send.mockResolvedValueOnce({
        items: [],
        page: 1,
        perPage: 20,
        total: 0,
      });

      const result = await service.list({ page: 1, perPage: 20 });

      expect(mediator.send).toHaveBeenCalledWith(expect.any(ListSessionsQuery));
      expect(result).toEqual({ items: [], page: 1, perPage: 20, total: 0 });
    });

    it('does not include tenantId in the dispatched query', async () => {
      mediator.send.mockResolvedValueOnce({ items: [], page: 1, perPage: 20, total: 0 });

      await service.list({ page: 1, perPage: 20, userId: 'user-1' });

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const sent = mediator.send.mock.calls[0]?.[0] as InstanceType<typeof ListSessionsQuery>;
      expect(sent).not.toHaveProperty('tenantId');
    });

    it('forwards total from the mediator response unchanged', async () => {
      mediator.send.mockResolvedValue({
        items: [],
        page: 1,
        perPage: 10,
        total: 42,
      });

      const result = await service.list({ page: 1, perPage: 10 });

      expect(result.total).toBe(42);
    });

    it('returns total: 0 when mediator returns total: 0', async () => {
      mediator.send.mockResolvedValue({
        items: [],
        page: 1,
        perPage: 10,
        total: 0,
      });

      const result = await service.list({ page: 1, perPage: 10 });

      expect(result.total).toBe(0);
    });

    it('returns items mapped through toSessionSummaryResponseDtoFromClient alongside total', async () => {
      mediator.send.mockResolvedValue({
        items: [
          {
            id: 'session-1',
            userId: 'user-1',
            promptSlug: 'prompt',
            purpose: 'test',
            status: 'active',
            title: null,
            startedAt: new Date('2026-01-01T00:00:00.000Z'),
            lastMessage: null,
            lastMessageAt: null,
            messageCount: 5,
          },
        ],
        page: 1,
        perPage: 10,
        total: 1,
      });

      const result = await service.list({ page: 1, perPage: 10 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
    });

    it('sends a ListSessionsQuery to the mediator', async () => {
      mediator.send.mockResolvedValue({ items: [], page: 1, perPage: 10, total: 0 });

      await service.list({ page: 1, perPage: 20 });

      expect(mediator.send).toHaveBeenCalledWith(expect.any(ListSessionsQuery));
    });
  });

  describe('list with pagination and date filters', () => {
    it('dispatches ListSessionsQuery with parsed ISO date strings converted to Date', async () => {
      mediator.send.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        perPage: 20,
      });

      const startedAtGte = new Date('2026-04-01T00:00:00.000Z');
      const startedAtLt = new Date('2026-05-01T00:00:00.000Z');

      await service.list({
        page: 1,
        perPage: 20,
        startedAtGte,
        startedAtLt,
      });

      expect(mediator.send).toHaveBeenCalledWith(
        expect.objectContaining({
          startedAtGte,
          startedAtLt,
        }),
      );
    });
  });

  describe('appendMessageEvent', () => {
    it('dispatches AppendSessionMessageEventCommand with sessionId and sentAt', async () => {
      mediator.send.mockResolvedValueOnce(undefined);

      const eventId = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
      const sentAt = new Date('2026-04-01T10:00:00.000Z');
      await service.appendMessageEvent('session-1', eventId, sentAt);

      expect(mediator.send).toHaveBeenCalledWith(expect.any(AppendSessionMessageEventCommand));
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const sent = mediator.send.mock.calls[0]?.[0] as InstanceType<
        typeof AppendSessionMessageEventCommand
      >;
      expect(sent.eventId).toBe(eventId);
      expect(sent.sessionId).toBe('session-1');
      expect(sent.sentAt).toEqual(sentAt);
    });

    it('maps client not found errors to HTTP errors', async () => {
      mediator.send.mockRejectedValueOnce(new SessionNotFoundClientError('missing'));

      await expect(
        service.appendMessageEvent('missing', 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', new Date()),
      ).rejects.toThrow(SessionNotFoundHttpError);
    });
  });

  describe('countMessages', () => {
    it('dispatches CountMessagesQuery and returns { count }', async () => {
      mediator.send.mockResolvedValueOnce({ count: 7 });

      const result = await service.countMessages({});

      expect(mediator.send).toHaveBeenCalledWith(expect.any(CountMessagesQuery));
      expect(result).toEqual({ count: 7 });
    });

    it('maps client not found errors to HTTP errors', async () => {
      mediator.send.mockRejectedValueOnce(new SessionNotFoundClientError('missing'));

      await expect(service.countMessages({})).rejects.toThrow(SessionNotFoundHttpError);
    });
  });

  describe('countMessages with all filters', () => {
    it('dispatches CountMessagesQuery with date and prefix filters', async () => {
      mediator.send.mockResolvedValueOnce({ count: 99 });

      const sentAtGte = new Date('2026-04-01T00:00:00.000Z');
      const sentAtLt = new Date('2026-05-01T00:00:00.000Z');

      const result = await service.countMessages({
        purposePrefix: 'ta-',
        sentAtGte,
        sentAtLt,
      });

      expect(result).toEqual({ count: 99 });
      expect(mediator.send).toHaveBeenCalledWith(
        expect.objectContaining({
          purposePrefix: 'ta-',
          sentAtGte,
          sentAtLt,
        }),
      );
    });

    it('does not include tenantId in the dispatched query', async () => {
      mediator.send.mockResolvedValueOnce({ count: 0 });

      await service.countMessages({});

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const sent = mediator.send.mock.calls[0]?.[0] as InstanceType<typeof CountMessagesQuery>;
      expect(sent).not.toHaveProperty('tenantId');
    });
  });
});
