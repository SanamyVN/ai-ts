import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import {
  RagIngestCommand,
  RagDeleteCommand,
  RagReplaceCommand,
  RagSearchQuery,
} from '@/business/domain/rag/client/queries.js';
import { mapRagError } from './rag.error.js';
import { toIngestResponseDto, toDeleteResponseDto, toReplaceResponseDto, toSearchResponseDto } from './rag.mapper.js';
import type {
  IngestRequestDto,
  IngestResponseDto,
  DeleteRequestDto,
  DeleteResponseDto,
  ReplaceRequestDto,
  ReplaceResponseDto,
  SearchRequestDto,
  SearchResponseDto,
} from './rag.dto.js';

@Injectable()
export class RagAppService {
  constructor(@Inject(AI_MEDIATOR) private readonly mediator: IMediator) {}

  async ingest(input: IngestRequestDto): Promise<IngestResponseDto> {
    try {
      const result = await this.mediator.send(new RagIngestCommand(input));
      return toIngestResponseDto(result);
    } catch (error) {
      mapRagError(error);
    }
  }

  async delete(input: DeleteRequestDto): Promise<DeleteResponseDto> {
    try {
      const result = await this.mediator.send(new RagDeleteCommand(input));
      return toDeleteResponseDto(result);
    } catch (error) {
      mapRagError(error);
    }
  }

  async replace(documentId: string, input: ReplaceRequestDto): Promise<ReplaceResponseDto> {
    try {
      const result = await this.mediator.send(
        new RagReplaceCommand({
          indexName: input.indexName,
          scopeId: input.scopeId,
          documentId,
          content: input.content,
          chunkOptions: input.chunkOptions,
        }),
      );
      return toReplaceResponseDto(result);
    } catch (error) {
      mapRagError(error);
    }
  }

  async search(input: SearchRequestDto): Promise<SearchResponseDto> {
    try {
      const result = await this.mediator.send(new RagSearchQuery(input));
      return toSearchResponseDto(result);
    } catch (error) {
      mapRagError(error);
    }
  }
}

export const RAG_APP_SERVICE = createToken<RagAppService>('RAG_APP_SERVICE');
