import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
} from '@/business/domain/rag/client/schemas.js';
import type { IngestResponseDto, DeleteResponseDto, ReplaceResponseDto } from './rag.dto.js';

export function toIngestResponseDto(result: IngestClientResult): IngestResponseDto {
  return { chunksStored: result.chunksStored };
}

export function toDeleteResponseDto(result: DeleteClientResult): DeleteResponseDto {
  return { chunksDeleted: result.chunksDeleted };
}

export function toReplaceResponseDto(result: ReplaceClientResult): ReplaceResponseDto {
  return { chunksDeleted: result.chunksDeleted, chunksStored: result.chunksStored };
}
