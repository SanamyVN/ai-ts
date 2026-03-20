import { type ChunkParams, MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_RAG, type IMastraRag } from '@/business/sdk/mastra/mastra.interface.js';
import { isMastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import type { IRagBusiness } from './rag.interface.js';
import type {
  IngestInput,
  IngestResult,
  DeleteInput,
  DeleteResult,
  ReplaceInput,
  ReplaceResult,
  RagContent,
  SearchInput,
  SearchResult,
} from './rag.model.js';
import {
  RagIngestError,
  RagDeleteError,
  RagEmbeddingError,
  RagContentProcessingError,
  RagSearchError,
} from './rag.error.js';

const DEFAULT_CHUNK_STRATEGY = 'recursive' as const;
const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_CHUNK_OVERLAP = 50;
const DEFAULT_EMBEDDING_BATCH_SIZE = 100;

@Injectable()
export class RagBusiness implements IRagBusiness {
  private readonly embeddingModel: ModelRouterEmbeddingModel;

  constructor(
    @Inject(MASTRA_RAG) private readonly mastraRag: IMastraRag,
    @Inject(AI_CONFIG) private readonly config: AiConfig,
  ) {
    this.embeddingModel = new ModelRouterEmbeddingModel(
      this.config.embeddingProvider
        ? {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            id: this.config.embeddingModel as `${string}/${string}`,
            url: this.config.embeddingProvider.url,
            ...(this.config.embeddingProvider.apiKey !== undefined && {
              apiKey: this.config.embeddingProvider.apiKey,
            }),
            ...(this.config.embeddingProvider.headers !== undefined && {
              headers: this.config.embeddingProvider.headers,
            }),
          }
        : this.config.embeddingModel,
    );
  }

  async ingest(input: IngestInput): Promise<IngestResult> {
    let totalChunks = 0;

    for (const doc of input.documents) {
      try {
        const mdoc = this.createDocument(doc.content, {
          documentId: doc.documentId,
          scopeId: input.scopeId,
        });

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const chunkParams: ChunkParams = {
          strategy: input.chunkOptions?.strategy ?? DEFAULT_CHUNK_STRATEGY,
          maxSize: input.chunkOptions?.maxSize ?? DEFAULT_CHUNK_SIZE,
          overlap: input.chunkOptions?.overlap ?? DEFAULT_CHUNK_OVERLAP,
        } as ChunkParams;
        const chunks = await mdoc.chunk(chunkParams);

        const texts = chunks.map((c) => c.text);
        const embeddings = await this.embedBatched(texts);

        const stored = await this.mastraRag.upsert(
          input.indexName,
          embeddings,
          chunks.map((c) => ({ text: c.text, documentId: doc.documentId, scopeId: input.scopeId })),
        );

        totalChunks += stored;
      } catch (error) {
        if (error instanceof RagEmbeddingError) {
          throw new RagIngestError(doc.documentId, error);
        }
        if (isMastraAdapterError(error)) {
          throw new RagIngestError(doc.documentId, error);
        }
        throw error;
      }
    }

    return { chunksStored: totalChunks };
  }

  async delete(input: DeleteInput): Promise<DeleteResult> {
    try {
      const chunksDeleted = await this.mastraRag.delete(input.indexName, input.filter);
      return { chunksDeleted };
    } catch (error) {
      if (isMastraAdapterError(error)) {
        throw new RagDeleteError(input.scopeId, error);
      }
      throw error;
    }
  }

  async replace(input: ReplaceInput): Promise<ReplaceResult> {
    const { chunksDeleted } = await this.delete({
      indexName: input.indexName,
      scopeId: input.scopeId,
      filter: { documentId: input.documentId },
    });

    const { chunksStored } = await this.ingest({
      indexName: input.indexName,
      scopeId: input.scopeId,
      documents: [{ documentId: input.documentId, content: input.content }],
      ...(input.chunkOptions !== undefined ? { chunkOptions: input.chunkOptions } : {}),
    });

    return { chunksDeleted, chunksStored };
  }

  async search(input: SearchInput): Promise<SearchResult> {
    try {
      const embeddings = await this.embedBatched([input.queryText]);
      const [queryVector] = embeddings;
      if (!queryVector) {
        throw new RagEmbeddingError(new Error('No embedding generated for query text'));
      }
      const items = await this.mastraRag.search(
        input.indexName,
        queryVector,
        input.topK,
        input.scopeId,
      );
      return { results: items };
    } catch (error) {
      if (error instanceof RagEmbeddingError) {
        throw new RagSearchError(input.scopeId, error);
      }
      if (isMastraAdapterError(error)) {
        throw new RagSearchError(input.scopeId, error);
      }
      throw error;
    }
  }

  private createDocument(content: RagContent, metadata: Record<string, unknown>): MDocument {
    switch (content.type) {
      case 'text':
        return MDocument.fromText(content.data, metadata);
      case 'html':
        return MDocument.fromHTML(content.data, metadata);
      case 'markdown':
        return MDocument.fromMarkdown(content.data, metadata);
      case 'json':
        return MDocument.fromJSON(content.data, metadata);
      default:
        throw new RagContentProcessingError(content.type);
    }
  }

  private async embedBatched(texts: string[]): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += DEFAULT_EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + DEFAULT_EMBEDDING_BATCH_SIZE);
      try {
        const { embeddings } = await embedMany({
          model: this.embeddingModel as any, // eslint-disable-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
          values: batch,
        });
        allEmbeddings.push(...embeddings);
      } catch (error) {
        throw new RagEmbeddingError(error);
      }
    }

    return allEmbeddings;
  }
}
