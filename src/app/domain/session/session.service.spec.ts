import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionAppService } from './session.service.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import {
  DeleteSessionCommand,
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

      expect(mediator.send).toHaveBeenCalledWith(
        expect.any(UpdateSessionTitleCommand),
      );
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
});
