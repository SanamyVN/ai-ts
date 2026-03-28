import { vi } from 'vitest';
import type { ISessionService } from './session.interface.js';

/**
 * Creates a mock `ISessionService` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub session service behavior without real infrastructure.
 *
 * @example
 * const service = createMockSessionService();
 * service.start.mockResolvedValue({ id: 's1', ... });
 */
export function createMockSessionService() {
  return {
    start: vi.fn<ISessionService['start']>(),
    pause: vi.fn<ISessionService['pause']>(),
    resume: vi.fn<ISessionService['resume']>(),
    end: vi.fn<ISessionService['end']>(),
    get: vi.fn<ISessionService['get']>(),
    list: vi.fn<ISessionService['list']>(),
    getMessages: vi.fn<ISessionService['getMessages']>(),
    exportTranscript: vi.fn<ISessionService['exportTranscript']>(),
    updateResolvedPrompt: vi.fn<ISessionService['updateResolvedPrompt']>(),
    updateLastMessage: vi.fn<ISessionService['updateLastMessage']>(),
  };
}
