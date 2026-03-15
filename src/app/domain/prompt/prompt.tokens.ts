import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface PromptMiddlewareConfig {
  readonly create?: MiddlewareInput[];
  readonly list?: MiddlewareInput[];
  readonly getBySlug?: MiddlewareInput[];
  readonly update?: MiddlewareInput[];
  readonly createVersion?: MiddlewareInput[];
  readonly activateVersion?: MiddlewareInput[];
  readonly listVersions?: MiddlewareInput[];
}

export const PROMPT_MIDDLEWARE_CONFIG = createToken<PromptMiddlewareConfig>(
  'PROMPT_MIDDLEWARE_CONFIG',
);
