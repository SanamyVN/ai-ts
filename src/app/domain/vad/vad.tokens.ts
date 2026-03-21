import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface VadMiddlewareConfig {
  readonly detectSpeech?: MiddlewareInput[];
}

export const VAD_MIDDLEWARE_CONFIG = createToken<VadMiddlewareConfig>('VAD_MIDDLEWARE_CONFIG');
