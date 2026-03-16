import type { IngestResult, DeleteResult, ReplaceResult } from '@/business/domain/rag/rag.model.js';
import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
} from '@/business/domain/rag/client/schemas.js';

export function toIngestClientResult(result: IngestResult): IngestClientResult {
  return { chunksStored: result.chunksStored };
}

export function toDeleteClientResult(result: DeleteResult): DeleteClientResult {
  return { chunksDeleted: result.chunksDeleted };
}

export function toReplaceClientResult(result: ReplaceResult): ReplaceClientResult {
  return { chunksDeleted: result.chunksDeleted, chunksStored: result.chunksStored };
}
