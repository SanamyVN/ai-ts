import { isRealtimeVoiceError } from '@/business/domain/realtime-voice/realtime-voice.error.js';
import { isRealtimeVoiceClientError } from '@/business/domain/realtime-voice/client/errors.js';

/** HTTP 500 error for realtime voice process-audio failures. */
export class RealtimeVoiceHttpProcessAudioError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

/** Maps realtime voice business/client errors to HTTP errors. Throws on match, re-throws unknown. */
export function mapRealtimeVoiceError(error: unknown): never {
  if (isRealtimeVoiceError(error) || isRealtimeVoiceClientError(error)) {
    throw new RealtimeVoiceHttpProcessAudioError(error.message, error);
  }
  throw error;
}
