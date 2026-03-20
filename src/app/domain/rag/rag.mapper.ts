import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
  SearchClientResult,
} from '@/business/domain/rag/client/schemas.js';
import type { IngestResponseDto, DeleteResponseDto, ReplaceResponseDto, SearchResponseDto } from './rag.dto.js';

export function toIngestResponseDto(result: IngestClientResult): IngestResponseDto {
  return { chunksStored: result.chunksStored };
}

export function toDeleteResponseDto(result: DeleteClientResult): DeleteResponseDto {
  return { chunksDeleted: result.chunksDeleted };
}

export function toReplaceResponseDto(result: ReplaceClientResult): ReplaceResponseDto {
  return { chunksDeleted: result.chunksDeleted, chunksStored: result.chunksStored };
}

export function toSearchResponseDto(result: SearchClientResult): SearchResponseDto {
  return { results: result.results };
}
