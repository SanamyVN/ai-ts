import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagBusiness } from './rag.business.js';
import { RagIngestError, RagDeleteError, RagSearchError } from './rag.error.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { createMockMastraRag } from '@/business/sdk/mastra/mastra.testing.js';
import type { AiConfig } from '@/config.js';
import type { IAiMetrics } from '@/foundation/ai-metrics/ai-metrics.interface.js';
import { createMockAiMetrics } from '@/foundation/ai-metrics/ai-metrics.testing.js';
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
    usage: { tokens: 42 },
  }),
}));

let capturedEmbeddingConfigs: unknown[] = [];

// Mock @mastra/core/llm
vi.mock('@mastra/core/llm', () => ({
  ModelRouterEmbeddingModel: class MockModelRouterEmbeddingModel {
    readonly specificationVersion = 'v1' as const;
    constructor(config: unknown) {
      capturedEmbeddingConfigs.push(config);
    }
  },
}));

const SCOPE_ID = '11111111-1111-4111-a111-111111111111';
const DOC_ID = '22222222-2222-4222-a222-222222222222';
const INDEX_NAME = 'knowledge';

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
  let mockAiMetrics: ReturnType<typeof createMockAiMetrics>;

  beforeEach(() => {
    capturedEmbeddingConfigs = [];
    vi.clearAllMocks();
    mastraRag = createMockMastraRag();
    mastraRag.upsert.mockResolvedValue(2);
    mastraRag.delete.mockResolvedValue(0);
    mockAiMetrics = createMockAiMetrics();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    business = new RagBusiness(mastraRag, config, mockAiMetrics as unknown as IAiMetrics);
  });

  describe('ingest', () => {
    const input: IngestInput = {
      indexName: INDEX_NAME,
      scopeId: SCOPE_ID,
      documents: [{ documentId: DOC_ID, content: { type: 'text', data: 'hello world' } }],
    };

    it('chunks, embeds, and upserts', async () => {
      const result = await business.ingest(input);

      expect(mastraRag.upsert).toHaveBeenCalledWith(
        INDEX_NAME,
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
        indexName: INDEX_NAME,
        scopeId: SCOPE_ID,
        documents: [{ documentId: DOC_ID, content: { type: 'html', data: '<p>hi</p>' } }],
      };

      const { MDocument } = await import('@mastra/rag');
      await business.ingest(htmlInput);
      expect(MDocument.fromHTML).toHaveBeenCalledWith('<p>hi</p>', expect.any(Object));
    });

    it('emits embedding usage metrics after successful ingest', async () => {
      await business.ingest({
        ...input,
        metricsContext: { 'ai.operation': 'rag_ingest', 'course.id': 'c-1' },
      });

      expect(mockAiMetrics.recordEmbeddingUsage).toHaveBeenCalledWith({
        model: 'openai/text-embedding-3-small',
        userId: 'unknown',
        totalTokens: 42,
        metricsContext: { 'ai.operation': 'rag_ingest', 'course.id': 'c-1' },
      });
      expect(mockAiMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'openai/text-embedding-3-small',
          status: 'success',
          metricsContext: { 'ai.operation': 'rag_ingest', 'course.id': 'c-1' },
        }),
      );
    });

    it('emits embedding error metric when embedding fails during ingest', async () => {
      const { embedMany } = await import('ai');
      vi.mocked(embedMany).mockRejectedValueOnce(new Error('rate limit'));

      await expect(
        business.ingest({
          ...input,
          metricsContext: { 'ai.operation': 'rag_ingest' },
        }),
      ).rejects.toThrow(RagIngestError);

      expect(mockAiMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'openai/text-embedding-3-small',
          status: 'error',
          metricsContext: { 'ai.operation': 'rag_ingest' },
        }),
      );
      expect(mockAiMetrics.recordEmbeddingUsage).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const input: DeleteInput = {
      indexName: INDEX_NAME,
      scopeId: SCOPE_ID,
      filter: { documentId: DOC_ID },
    };

    it('deletes vectors by filter and returns count', async () => {
      const result = await business.delete(input);

      expect(mastraRag.delete).toHaveBeenCalledWith(INDEX_NAME, { documentId: DOC_ID });
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
      indexName: INDEX_NAME,
      scopeId: SCOPE_ID,
      documentId: DOC_ID,
      content: { type: 'text', data: 'updated content' },
    };

    it('deletes then ingests and returns both counts', async () => {
      const result = await business.replace(input);

      expect(mastraRag.delete).toHaveBeenCalledWith(INDEX_NAME, { documentId: DOC_ID });
      expect(mastraRag.upsert).toHaveBeenCalled();
      expect(result).toEqual({ chunksDeleted: 0, chunksStored: 2 });
    });
  });

  describe('search', () => {
    it('embeds query text, calls mastraRag.search, and returns results', async () => {
      mastraRag.search.mockResolvedValue([{ text: 'chunk', score: 0.9 }]);

      const result = await business.search({
        indexName: INDEX_NAME,
        scopeId: SCOPE_ID,
        queryText: 'hello',
        topK: 3,
      });

      expect(mastraRag.search).toHaveBeenCalledWith(INDEX_NAME, [0.1, 0.2], 3, SCOPE_ID, undefined);
      expect(result).toEqual({ results: [{ text: 'chunk', score: 0.9 }] });
    });

    it('wraps MastraAdapterError as RagSearchError', async () => {
      mastraRag.search.mockRejectedValueOnce(
        new MastraAdapterError('search', new Error('pg error')),
      );

      await expect(
        business.search({ indexName: INDEX_NAME, scopeId: SCOPE_ID, queryText: 'hello', topK: 3 }),
      ).rejects.toThrow(RagSearchError);
    });

    it('wraps embedding failure as RagSearchError', async () => {
      const { embedMany } = await import('ai');
      vi.mocked(embedMany).mockRejectedValueOnce(new Error('rate limit'));

      await expect(
        business.search({ indexName: INDEX_NAME, scopeId: SCOPE_ID, queryText: 'hello', topK: 3 }),
      ).rejects.toThrow(RagSearchError);
    });

    it('emits embedding usage metrics after successful search', async () => {
      mastraRag.search.mockResolvedValue([{ text: 'chunk', score: 0.9 }]);

      await business.search({
        indexName: INDEX_NAME,
        scopeId: SCOPE_ID,
        queryText: 'hello',
        topK: 3,
        metricsContext: { 'ai.operation': 'rag_search', 'course.id': 'c-2' },
      });

      expect(mockAiMetrics.recordEmbeddingUsage).toHaveBeenCalledWith({
        model: 'openai/text-embedding-3-small',
        userId: 'unknown',
        totalTokens: 42,
        metricsContext: { 'ai.operation': 'rag_search', 'course.id': 'c-2' },
      });
    });

    it('emits embedding error metric when search embedding fails', async () => {
      const { embedMany } = await import('ai');
      vi.mocked(embedMany).mockRejectedValueOnce(new Error('rate limit'));

      await expect(
        business.search({
          indexName: INDEX_NAME,
          scopeId: SCOPE_ID,
          queryText: 'hello',
          topK: 3,
          metricsContext: { 'ai.operation': 'rag_search' },
        }),
      ).rejects.toThrow(RagSearchError);

      expect(mockAiMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' }),
      );
    });

    it('passes documentIds to mastraRag.search when provided', async () => {
      mastraRag.search.mockResolvedValue([{ text: 'filtered', score: 0.95 }]);

      const result = await business.search({
        indexName: INDEX_NAME,
        scopeId: SCOPE_ID,
        queryText: 'hello',
        topK: 3,
        documentIds: ['doc-1', 'doc-2'],
      });

      expect(mastraRag.search).toHaveBeenCalledWith(INDEX_NAME, [0.1, 0.2], 3, SCOPE_ID, [
        'doc-1',
        'doc-2',
      ]);
      expect(result).toEqual({ results: [{ text: 'filtered', score: 0.95 }] });
    });
  });

  describe('embedding model configuration', () => {
    it('passes string to ModelRouterEmbeddingModel when embeddingProvider is absent', () => {
      // beforeEach already created a RagBusiness with default config (no embeddingProvider)
      expect(capturedEmbeddingConfigs).toHaveLength(1);
      expect(capturedEmbeddingConfigs[0]).toBe('openai/text-embedding-3-small');
    });

    it('passes OpenAICompatibleConfig when embeddingProvider is set', () => {
      const configWithProvider: AiConfig = {
        ...config,
        embeddingModel: 'ollama/nomic-embed-text',
        embeddingDimension: 768,
        embeddingProvider: {
          url: 'http://localhost:11434/v1',
        },
      };

      new RagBusiness(
        createMockMastraRag(),
        configWithProvider,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        mockAiMetrics as unknown as IAiMetrics,
      );

      // capturedEmbeddingConfigs[0] is from beforeEach (string), [1] is from this test (object)
      expect(capturedEmbeddingConfigs[1]).toEqual(
        expect.objectContaining({
          id: 'ollama/nomic-embed-text',
          url: 'http://localhost:11434/v1',
        }),
      );
    });

    it('passes apiKey and headers when provided in embeddingProvider', () => {
      const configWithAuth: AiConfig = {
        ...config,
        embeddingModel: 'custom/my-model',
        embeddingDimension: 1024,
        embeddingProvider: {
          url: 'https://embeddings.example.com/v1',
          apiKey: 'sk-test',
          headers: { 'X-Custom': 'value' },
        },
      };

      new RagBusiness(
        createMockMastraRag(),
        configWithAuth,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        mockAiMetrics as unknown as IAiMetrics,
      );

      expect(capturedEmbeddingConfigs[1]).toEqual(
        expect.objectContaining({
          id: 'custom/my-model',
          url: 'https://embeddings.example.com/v1',
          apiKey: 'sk-test',
          headers: { 'X-Custom': 'value' },
        }),
      );
    });
  });
});
