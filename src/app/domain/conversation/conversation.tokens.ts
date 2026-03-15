import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface ConversationMiddlewareConfig {
  readonly create?: MiddlewareInput[];
  readonly sendMessage?: MiddlewareInput[];
  readonly streamMessage?: MiddlewareInput[];
}

export const CONVERSATION_MIDDLEWARE_CONFIG = createToken<ConversationMiddlewareConfig>(
  'CONVERSATION_MIDDLEWARE_CONFIG',
);
