import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface RagMiddlewareConfig {
  readonly ingest?: MiddlewareInput[];
  readonly delete?: MiddlewareInput[];
  readonly replace?: MiddlewareInput[];
}

export const RAG_MIDDLEWARE_CONFIG = createToken<RagMiddlewareConfig>('RAG_MIDDLEWARE_CONFIG');
