import { createToken, type IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface RagMiddlewareConfig {
  readonly ingest?: MiddlewareInput[];
  readonly delete?: MiddlewareInput[];
  readonly replace?: MiddlewareInput[];
  readonly search?: MiddlewareInput[];
}

export const RAG_MIDDLEWARE_CONFIG: IToken<RagMiddlewareConfig> = createToken<RagMiddlewareConfig>('RAG_MIDDLEWARE_CONFIG');
