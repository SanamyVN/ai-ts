import { createToken, type IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface VadMiddlewareConfig {
  readonly detectSpeech?: MiddlewareInput[];
}

export const VAD_MIDDLEWARE_CONFIG: IToken<VadMiddlewareConfig> = createToken<VadMiddlewareConfig>('VAD_MIDDLEWARE_CONFIG');
