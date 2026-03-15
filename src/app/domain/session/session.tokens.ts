import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface SessionMiddlewareConfig {
  readonly list?: MiddlewareInput[];
  readonly get?: MiddlewareInput[];
  readonly getMessages?: MiddlewareInput[];
  readonly exportTranscript?: MiddlewareInput[];
  readonly end?: MiddlewareInput[];
}

export const SESSION_MIDDLEWARE_CONFIG = createToken<SessionMiddlewareConfig>(
  'SESSION_MIDDLEWARE_CONFIG',
);
