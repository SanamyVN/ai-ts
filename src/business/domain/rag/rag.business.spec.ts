import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagBusiness } from './rag.business.js';
import { RagIngestError, RagDeleteError } from './rag.error.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { createMockMastraRag } from '@/business/sdk/mastra/mastra.testing.js';
import type { AiConfig } from '@/config.js';
import type { IngestInput, DeleteInput, ReplaceInput } from './rag.model.js';

// Mock @mastra/rag
vi.mock('@mastra/rag', () => ({
  MDocument: {
    fromText: vi.fn().mockReturnValue({
      chunk: vi.fn().mockResolvedValue([{ text: 'chunk-1' }, { text: 'chunk-2' }]),
    }),
    fromHTML: vi.fn().mockReturnValue({
      chunk: vi.fn().mockResolvedValue([{ text: 'html-chunk' }]),
    }),
    fromMarkdown: vi.fn().mockReturnValue({
      chunk: vi.fn().mockResolvedValue([{ text: 'md-chunk' }]),
    }),
    fromJSON: vi.fn().mockReturnValue({
      chunk: vi.fn().mockResolvedValue([{ text: 'json-chunk' }]),
    }),
  },
}));

// Mock ai SDK
vi.mock('ai', () => ({
  embedMany: vi.fn().mockResolvedValue({
    embeddings: [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
  }),
}));

// Mock @mastra/core/llm
vi.mock('@mastra/core/llm', () => ({
  ModelRouterEmbeddingModel: class MockModelRouterEmbeddingModel {
    readonly specificationVersion = 'v1' as const;
  },
}));

const SCOPE_ID = '11111111-1111-4111-a111-111111111111';
const DOC_ID = '22222222-2222-4222-a222-222222222222';

const config: AiConfig = {
  defaultModel: 'anthropic/claude-sonnet-4-20250514',
  prompt: { maxVersions: 50 },
  session: { transcriptPageSize: 100 },
  embeddingModel: 'openai/text-embedding-3-small',
  embeddingDimension: 1536,
};

describe('RagBusiness', () => {
  let mastraRag: ReturnType<typeof createMockMastraRag>;
  let business: RagBusiness;

  beforeEach(() => {
    vi.clearAllMocks();
    mastraRag = createMockMastraRag();
    mastraRag.createIndex.mockResolvedValue(undefined);
    mastraRag.upsert.mockResolvedValue(2);
    mastraRag.delete.mockResolvedValue(0);
    business = new RagBusiness(mastraRag, config);
  });

  describe('ingest', () => {
    const input: IngestInput = {
      scopeId: SCOPE_ID,
      documents: [{ documentId: DOC_ID, content: { type: 'text', data: 'hello world' } }],
    };

    it('creates index, chunks, embeds, and upserts', async () => {
      const result = await business.ingest(input);

      expect(mastraRag.createIndex).toHaveBeenCalledWith(SCOPE_ID, 1536);
      expect(mastraRag.upsert).toHaveBeenCalledWith(
        SCOPE_ID,
        [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        expect.arrayContaining([
          expect.objectContaining({ documentId: DOC_ID, scopeId: SCOPE_ID }),
        ]),
      );
      expect(result).toEqual({ chunksStored: 2 });
    });

    it('wraps MastraAdapterError during createIndex as RagIngestError', async () => {
      mastraRag.createIndex.mockRejectedValueOnce(
        new MastraAdapterError('createIndex', new Error('pg error')),
      );

      await expect(business.ingest(input)).rejects.toThrow(RagIngestError);
    });

    it('wraps MastraAdapterError during upsert as RagIngestError', async () => {
      mastraRag.upsert.mockRejectedValueOnce(
        new MastraAdapterError('upsert', new Error('pg error')),
      );

      await expect(business.ingest(input)).rejects.toThrow(RagIngestError);
    });

    it('wraps embedding failure as RagIngestError', async () => {
      const { embedMany } = await import('ai');
      vi.mocked(embedMany).mockRejectedValueOnce(new Error('rate limit'));

      await expect(business.ingest(input)).rejects.toThrow(RagIngestError);
    });

    it('supports html content type', async () => {
      const htmlInput: IngestInput = {
        scopeId: SCOPE_ID,
        documents: [{ documentId: DOC_ID, content: { type: 'html', data: '<p>hi</p>' } }],
      };

      const { MDocument } = await import('@mastra/rag');
      await business.ingest(htmlInput);
      expect(MDocument.fromHTML).toHaveBeenCalledWith('<p>hi</p>', expect.any(Object));
    });
  });

  describe('delete', () => {
    const input: DeleteInput = {
      scopeId: SCOPE_ID,
      filter: { documentId: DOC_ID },
    };

    it('deletes vectors by filter and returns count', async () => {
      const result = await business.delete(input);

      expect(mastraRag.delete).toHaveBeenCalledWith(SCOPE_ID, { documentId: DOC_ID });
      expect(result).toEqual({ chunksDeleted: 0 });
    });

    it('wraps MastraAdapterError as RagDeleteError', async () => {
      mastraRag.delete.mockRejectedValueOnce(
        new MastraAdapterError('delete', new Error('pg error')),
      );

      await expect(business.delete(input)).rejects.toThrow(RagDeleteError);
    });
  });

  describe('replace', () => {
    const input: ReplaceInput = {
      scopeId: SCOPE_ID,
      documentId: DOC_ID,
      content: { type: 'text', data: 'updated content' },
    };

    it('deletes then ingests and returns both counts', async () => {
      const result = await business.replace(input);

      expect(mastraRag.delete).toHaveBeenCalledWith(SCOPE_ID, { documentId: DOC_ID });
      expect(mastraRag.upsert).toHaveBeenCalled();
      expect(result).toEqual({ chunksDeleted: 0, chunksStored: 2 });
    });
  });
});
