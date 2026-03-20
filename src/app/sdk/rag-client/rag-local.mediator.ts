import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { RAG_BUSINESS, type IRagBusiness } from '@/business/domain/rag/rag.interface.js';
import type { IRagMediator } from '@/business/domain/rag/client/mediator.js';
import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
  SearchClientResult,
} from '@/business/domain/rag/client/schemas.js';
import type {
  RagIngestCommand,
  RagDeleteCommand,
  RagReplaceCommand,
  RagSearchQuery,
} from '@/business/domain/rag/client/queries.js';
import type { ChunkOptions } from '@/business/domain/rag/rag.model.js';
import { toIngestClientResult, toDeleteClientResult, toReplaceClientResult, toSearchClientResult } from './rag.mapper.js';

function toChunkOptions(
  raw:
    | {
        strategy?: ChunkOptions['strategy'] | undefined;
        maxSize?: number | undefined;
        overlap?: number | undefined;
      }
    | undefined,
): ChunkOptions | undefined {
  if (raw === undefined) return undefined;
  return {
    ...(raw.strategy !== undefined ? { strategy: raw.strategy } : {}),
    ...(raw.maxSize !== undefined ? { maxSize: raw.maxSize } : {}),
    ...(raw.overlap !== undefined ? { overlap: raw.overlap } : {}),
  };
}

@Injectable()
export class RagLocalMediator implements IRagMediator {
  constructor(@Inject(RAG_BUSINESS) private readonly ragBusiness: IRagBusiness) {}

  async ingest(command: InstanceType<typeof RagIngestCommand>): Promise<IngestClientResult> {
    const chunkOptions = toChunkOptions(command.chunkOptions);
    const result = await this.ragBusiness.ingest({
      indexName: command.indexName,
      scopeId: command.scopeId,
      documents: command.documents,
      ...(chunkOptions !== undefined ? { chunkOptions } : {}),
    });
    return toIngestClientResult(result);
  }

  async delete(command: InstanceType<typeof RagDeleteCommand>): Promise<DeleteClientResult> {
    const result = await this.ragBusiness.delete({
      indexName: command.indexName,
      scopeId: command.scopeId,
      filter: command.filter,
    });
    return toDeleteClientResult(result);
  }

  async replace(command: InstanceType<typeof RagReplaceCommand>): Promise<ReplaceClientResult> {
    const chunkOptions = toChunkOptions(command.chunkOptions);
    const result = await this.ragBusiness.replace({
      indexName: command.indexName,
      scopeId: command.scopeId,
      documentId: command.documentId,
      content: command.content,
      ...(chunkOptions !== undefined ? { chunkOptions } : {}),
    });
    return toReplaceClientResult(result);
  }

  async search(query: InstanceType<typeof RagSearchQuery>): Promise<SearchClientResult> {
    const result = await this.ragBusiness.search({
      indexName: query.indexName,
      scopeId: query.scopeId,
      queryText: query.queryText,
      topK: query.topK,
    });
    return toSearchClientResult(result);
  }
}
