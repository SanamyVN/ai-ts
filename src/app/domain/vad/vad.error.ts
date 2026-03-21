import { isVadError } from '@/business/domain/vad/vad.error.js';
import { isVadClientError } from '@/business/domain/vad/client/errors.js';

/** HTTP 500 error for VAD detect-speech failures. */
export class VadHttpDetectSpeechError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

/** Maps VAD business/client errors to HTTP errors. Throws on match, re-throws unknown. */
export function mapVadError(error: unknown): never {
  if (isVadError(error) || isVadClientError(error)) {
    throw new VadHttpDetectSpeechError(error.message, error);
  }
  throw error;
}
