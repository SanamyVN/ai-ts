import { isVoiceTtsError, isVoiceSttError } from '@/business/domain/voice/voice.error.js';
import {
  isVoiceClientTtsError,
  isVoiceClientSttError,
} from '@/business/domain/voice/client/errors.js';

/** HTTP 500 error for TTS failures. */
export class VoiceHttpTtsError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

/** HTTP 500 error for STT failures. */
export class VoiceHttpSttError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

/** Maps voice business/client errors to HTTP errors. Throws on match, re-throws unknown. */
export function mapVoiceError(error: unknown): never {
  if (isVoiceTtsError(error) || isVoiceClientTtsError(error)) {
    throw new VoiceHttpTtsError(error.message, error);
  }
  if (isVoiceSttError(error) || isVoiceClientSttError(error)) {
    throw new VoiceHttpSttError(error.message, error);
  }
  throw error;
}
