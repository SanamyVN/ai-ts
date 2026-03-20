import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IRagMediator } from '@/business/domain/rag/client/mediator.js';
import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
  SearchClientResult,
} from '@/business/domain/rag/client/schemas.js';
import {
  ingestResultSchema,
  deleteResultSchema,
  replaceResultSchema,
  searchResultSchema,
} from '@/business/domain/rag/client/schemas.js';
import type {
  RagIngestCommand,
  RagDeleteCommand,
  RagReplaceCommand,
  RagSearchQuery,
} from '@/business/domain/rag/client/queries.js';
import {
  RagIngestClientError,
  RagDeleteClientError,
  RagReplaceClientError,
  RagSearchClientError,
} from '@/business/domain/rag/client/errors.js';

export interface HttpClient {
  post(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  delete(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  put(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
}

export const AI_RAG_HTTP_CLIENT = createToken<HttpClient>('AI_RAG_HTTP_CLIENT');
export const AI_RAG_REMOTE_CONFIG = createToken<{ baseUrl: string }>('AI_RAG_REMOTE_CONFIG');

@Injectable()
export class RagRemoteMediator implements IRagMediator {
  constructor(
    @Inject(AI_RAG_HTTP_CLIENT) private readonly http: HttpClient,
    @Inject(AI_RAG_REMOTE_CONFIG) private readonly config: { baseUrl: string },
  ) {}

  async ingest(command: InstanceType<typeof RagIngestCommand>): Promise<IngestClientResult> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/rag/ingest`, {
      indexName: command.indexName,
      scopeId: command.scopeId,
      documents: command.documents,
      chunkOptions: command.chunkOptions,
    });
    if (!response.ok) {
      throw new RagIngestClientError(new Error(`RAG ingest failed: ${response.status}`));
    }
    return ingestResultSchema.parse(response.body?.data);
  }

  async delete(command: InstanceType<typeof RagDeleteCommand>): Promise<DeleteClientResult> {
    const response = await this.http.delete(`${this.config.baseUrl}/ai/rag/documents`, {
      indexName: command.indexName,
      scopeId: command.scopeId,
      filter: command.filter,
    });
    if (!response.ok) {
      throw new RagDeleteClientError(new Error(`RAG delete failed: ${response.status}`));
    }
    return deleteResultSchema.parse(response.body?.data);
  }

  async replace(command: InstanceType<typeof RagReplaceCommand>): Promise<ReplaceClientResult> {
    const response = await this.http.put(
      `${this.config.baseUrl}/ai/rag/documents/${command.documentId}`,
      {
        indexName: command.indexName,
        scopeId: command.scopeId,
        content: command.content,
        chunkOptions: command.chunkOptions,
      },
    );
    if (!response.ok) {
      throw new RagReplaceClientError(new Error(`RAG replace failed: ${response.status}`));
    }
    return replaceResultSchema.parse(response.body?.data);
  }

  async search(query: InstanceType<typeof RagSearchQuery>): Promise<SearchClientResult> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/rag/search`, {
      indexName: query.indexName,
      scopeId: query.scopeId,
      queryText: query.queryText,
      topK: query.topK,
    });
    if (!response.ok) {
      throw new RagSearchClientError(new Error(`RAG search failed: ${response.status}`));
    }
    return searchResultSchema.parse(response.body?.data);
  }
}
