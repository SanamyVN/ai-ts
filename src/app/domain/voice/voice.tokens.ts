import { createToken, type IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface VoiceMiddlewareConfig {
  readonly textToSpeech?: MiddlewareInput[];
  readonly speechToText?: MiddlewareInput[];
  readonly getSpeakers?: MiddlewareInput[];
}

export const VOICE_MIDDLEWARE_CONFIG: IToken<VoiceMiddlewareConfig> = createToken<VoiceMiddlewareConfig>('VOICE_MIDDLEWARE_CONFIG');
