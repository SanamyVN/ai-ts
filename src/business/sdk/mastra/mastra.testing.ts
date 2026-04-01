import { vi } from 'vitest';
import type {
  IMastraAgent,
  IMastraMemory,
  IMastraRag,
  IMastraVoiceTts,
  IMastraVoiceStt,
  IMastraVoiceRealtime,
} from './mastra.interface.js';

/**
 * Creates a mock `IMastraAgent` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub Mastra agent behavior without a real LLM.
 *
 * @example
 * const agent = createMockMastraAgent();
 * agent.generate.mockResolvedValue({ text: 'hi', threadId: 't1' });
 */
export function createMockMastraAgent() {
  return {
    generate: vi.fn<IMastraAgent['generate']>(),
    stream: vi.fn<IMastraAgent['stream']>(),
  };
}

/**
 * Creates a mock `IMastraMemory` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub memory operations without a real storage backend.
 *
 * @example
 * const memory = createMockMastraMemory();
 * memory.createThread.mockResolvedValue({ id: 't1', resourceId: 'r1' });
 */
export function createMockMastraMemory() {
  return {
    createThread: vi.fn<IMastraMemory['createThread']>(),
    getMessages: vi.fn<IMastraMemory['getMessages']>(),
    listThreads: vi.fn<IMastraMemory['listThreads']>(),
    saveMessages: vi.fn<IMastraMemory['saveMessages']>(),
  };
}

/**
 * Creates a mock `IMastraRag` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub RAG operations without a real vector store.
 *
 * @example
 * const rag = createMockMastraRag();
 * rag.upsert.mockResolvedValue(undefined);
 */
export function createMockMastraRag() {
  return {
    upsert: vi.fn<IMastraRag['upsert']>(),
    delete: vi.fn<IMastraRag['delete']>(),
    search: vi.fn<IMastraRag['search']>(),
  };
}

/**
 * Creates a mock `IMastraVoiceTts` with all methods stubbed via `vi.fn()`.
 *
 * @example
 * const tts = createMockMastraVoiceTts();
 * tts.textToSpeech.mockResolvedValue(audioStream);
 */
export function createMockMastraVoiceTts() {
  return {
    textToSpeech: vi.fn<IMastraVoiceTts['textToSpeech']>(),
    getSpeakers: vi.fn<IMastraVoiceTts['getSpeakers']>(),
  };
}

/**
 * Creates a mock `IMastraVoiceStt` with all methods stubbed via `vi.fn()`.
 *
 * @example
 * const stt = createMockMastraVoiceStt();
 * stt.speechToText.mockResolvedValue('hello');
 */
export function createMockMastraVoiceStt() {
  return {
    speechToText: vi.fn<IMastraVoiceStt['speechToText']>(),
    getListener: vi.fn<IMastraVoiceStt['getListener']>(),
  };
}

/**
 * Creates a mock `IMastraVoiceRealtime` with all methods stubbed via `vi.fn()`.
 *
 * @example
 * const realtime = createMockMastraVoiceRealtime();
 * realtime.openSession.mockResolvedValue(undefined);
 */
export function createMockMastraVoiceRealtime() {
  return {
    openSession: vi.fn<IMastraVoiceRealtime['openSession']>(),
    closeSession: vi.fn<IMastraVoiceRealtime['closeSession']>(),
    sendAudio: vi.fn<IMastraVoiceRealtime['sendAudio']>(),
    sendText: vi.fn<IMastraVoiceRealtime['sendText']>(),
    triggerResponse: vi.fn<IMastraVoiceRealtime['triggerResponse']>(),
    onEvent: vi.fn<IMastraVoiceRealtime['onEvent']>(),
    offEvent: vi.fn<IMastraVoiceRealtime['offEvent']>(),
    addTools: vi.fn<IMastraVoiceRealtime['addTools']>(),
    addInstructions: vi.fn<IMastraVoiceRealtime['addInstructions']>(),
    updateConfig: vi.fn<IMastraVoiceRealtime['updateConfig']>(),
  };
}
