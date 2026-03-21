import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface RealtimeVoiceMiddlewareConfig {
  readonly processAudio?: MiddlewareInput[];
}

export const REALTIME_VOICE_MIDDLEWARE_CONFIG = createToken<RealtimeVoiceMiddlewareConfig>(
  'REALTIME_VOICE_MIDDLEWARE_CONFIG',
);
