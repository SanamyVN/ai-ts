import { vi } from 'vitest';
import type { IVoiceBusiness } from './voice.interface.js';

/**
 * Creates a mock `IVoiceBusiness` with all methods stubbed via `vi.fn()`.
 *
 * @example
 * const voice = createMockVoiceBusiness();
 * voice.textToSpeech.mockResolvedValue({ audioStream });
 */
export function createMockVoiceBusiness() {
  return {
    textToSpeech: vi.fn<IVoiceBusiness['textToSpeech']>(),
    speechToText: vi.fn<IVoiceBusiness['speechToText']>(),
    getSpeakers: vi.fn<IVoiceBusiness['getSpeakers']>(),
  };
}
