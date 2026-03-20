import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { IngestClientResult, DeleteClientResult, ReplaceClientResult, SearchClientResult } from './schemas.js';
import { RagIngestCommand, RagDeleteCommand, RagReplaceCommand, RagSearchQuery } from './queries.js';

export interface IRagMediator {
  ingest(command: InstanceType<typeof RagIngestCommand>): Promise<IngestClientResult>;
  delete(command: InstanceType<typeof RagDeleteCommand>): Promise<DeleteClientResult>;
  replace(command: InstanceType<typeof RagReplaceCommand>): Promise<ReplaceClientResult>;
  search(query: InstanceType<typeof RagSearchQuery>): Promise<SearchClientResult>;
}

export const RAG_MEDIATOR = createMediatorToken<IRagMediator>('RAG_MEDIATOR', {
  ingest: RagIngestCommand,
  delete: RagDeleteCommand,
  replace: RagReplaceCommand,
  search: RagSearchQuery,
});
