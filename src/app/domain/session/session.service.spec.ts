import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionAppService } from './session.service.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import {
  AppendSessionMessageEventCommand,
  CountMessagesByTenantQuery,
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
    it('dispatches ListSessionsQuery with page and perPage and returns { items, page, perPage }', async () => {
      mediator.send.mockResolvedValueOnce({
        items: [],
        page: 1,
        perPage: 20,
      });

      const result = await service.list({ page: 1, perPage: 20 });

      expect(mediator.send).toHaveBeenCalledWith(expect.any(ListSessionsQuery));
      expect(result).toEqual({ items: [], page: 1, perPage: 20 });
    });
  });

  describe('list with pagination and date filters', () => {
    it('dispatches ListSessionsQuery with parsed ISO date strings converted to Date', async () => {
      mediator.send.mockResolvedValueOnce({
        items: [],
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

      const sentAt = new Date('2026-04-01T10:00:00.000Z');
      await service.appendMessageEvent('session-1', sentAt);

      expect(mediator.send).toHaveBeenCalledWith(expect.any(AppendSessionMessageEventCommand));
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const sent = mediator.send.mock.calls[0]?.[0] as InstanceType<
        typeof AppendSessionMessageEventCommand
      >;
      expect(sent.sessionId).toBe('session-1');
      expect(sent.sentAt).toEqual(sentAt);
    });
  });

  describe('countMessagesByTenant', () => {
    it('dispatches CountMessagesByTenantQuery and returns { count }', async () => {
      mediator.send.mockResolvedValueOnce({ count: 7 });

      const result = await service.countMessagesByTenant({ tenantId: 'tenant-1' });

      expect(mediator.send).toHaveBeenCalledWith(expect.any(CountMessagesByTenantQuery));
      expect(result).toEqual({ count: 7 });
    });
  });

  describe('countMessagesByTenant with all filters', () => {
    it('dispatches CountMessagesByTenantQuery with date filters', async () => {
      mediator.send.mockResolvedValueOnce({ count: 99 });

      const sentAtGte = new Date('2026-04-01T00:00:00.000Z');
      const sentAtLt = new Date('2026-05-01T00:00:00.000Z');

      const result = await service.countMessagesByTenant({
        tenantId: 'tenant-1',
        purposePrefix: 'ta-',
        sentAtGte,
        sentAtLt,
      });

      expect(result).toEqual({ count: 99 });
      expect(mediator.send).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          purposePrefix: 'ta-',
          sentAtGte,
          sentAtLt,
        }),
      );
    });
  });
});
