import { createCommand } from '@sanamyvn/foundation/mediator/request';
import {
  ingestClientSchema,
  deleteClientSchema,
  replaceClientSchema,
  ingestResultSchema,
  deleteResultSchema,
  replaceResultSchema,
} from './schemas.js';

export const RagIngestCommand = createCommand({
  type: 'ai.rag.ingest',
  payload: ingestClientSchema,
  response: ingestResultSchema,
});

export const RagDeleteCommand = createCommand({
  type: 'ai.rag.delete',
  payload: deleteClientSchema,
  response: deleteResultSchema,
});

export const RagReplaceCommand = createCommand({
  type: 'ai.rag.replace',
  payload: replaceClientSchema,
  response: replaceResultSchema,
});
