import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagAppService } from './rag.service.js';
import { RagHttpIngestError, RagHttpDeleteError } from './rag.error.js';
import { RagIngestError, RagDeleteError } from '@/business/domain/rag/rag.error.js';

const SCOPE_ID = '11111111-1111-4111-a111-111111111111';
const DOC_ID = '22222222-2222-4222-a222-222222222222';

describe('RagAppService', () => {
  let mediator: { send: ReturnType<typeof vi.fn> };
  let service: RagAppService;

  beforeEach(() => {
    mediator = { send: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    service = new RagAppService(mediator as never);
  });

  describe('ingest', () => {
    it('returns chunksStored on success', async () => {
      mediator.send.mockResolvedValueOnce({ chunksStored: 5 });

      const result = await service.ingest({
        scopeId: SCOPE_ID,
        documents: [{ documentId: DOC_ID, content: { type: 'text', data: 'hello' } }],
      });

      expect(result).toEqual({ chunksStored: 5 });
    });

    it('maps RagIngestError to RagHttpIngestError', async () => {
      mediator.send.mockRejectedValueOnce(new RagIngestError(DOC_ID));

      await expect(
        service.ingest({
          scopeId: SCOPE_ID,
          documents: [{ documentId: DOC_ID, content: { type: 'text', data: 'hello' } }],
        }),
      ).rejects.toThrow(RagHttpIngestError);
    });
  });

  describe('delete', () => {
    it('returns chunksDeleted on success', async () => {
      mediator.send.mockResolvedValueOnce({ chunksDeleted: 3 });

      const result = await service.delete({ scopeId: SCOPE_ID, filter: { documentId: DOC_ID } });

      expect(result).toEqual({ chunksDeleted: 3 });
    });

    it('maps RagDeleteError to RagHttpDeleteError', async () => {
      mediator.send.mockRejectedValueOnce(new RagDeleteError(SCOPE_ID));

      await expect(
        service.delete({ scopeId: SCOPE_ID, filter: { documentId: DOC_ID } }),
      ).rejects.toThrow(RagHttpDeleteError);
    });
  });

  describe('replace', () => {
    it('returns both counts on success', async () => {
      mediator.send.mockResolvedValueOnce({ chunksDeleted: 3, chunksStored: 7 });

      const result = await service.replace(DOC_ID, {
        scopeId: SCOPE_ID,
        content: { type: 'text', data: 'updated' },
      });

      expect(result).toEqual({ chunksDeleted: 3, chunksStored: 7 });
    });
  });
});
