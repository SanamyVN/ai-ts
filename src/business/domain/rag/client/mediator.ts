import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { IngestClientResult, DeleteClientResult, ReplaceClientResult } from './schemas.js';
import { RagIngestCommand, RagDeleteCommand, RagReplaceCommand } from './queries.js';

export interface IRagMediator {
  ingest(command: InstanceType<typeof RagIngestCommand>): Promise<IngestClientResult>;
  delete(command: InstanceType<typeof RagDeleteCommand>): Promise<DeleteClientResult>;
  replace(command: InstanceType<typeof RagReplaceCommand>): Promise<ReplaceClientResult>;
}

export const RAG_MEDIATOR = createMediatorToken<IRagMediator>('RAG_MEDIATOR', {
  ingest: RagIngestCommand,
  delete: RagDeleteCommand,
  replace: RagReplaceCommand,
});
