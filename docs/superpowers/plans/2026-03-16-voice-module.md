# Voice Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TTS, STT, and Realtime voice adapters wrapping Mastra Voice behind three segregated interfaces, plus a business layer and app layer for TTS/STT.

**Architecture:** Three SDK adapters (`MastraVoiceTtsAdapter`, `MastraVoiceSttAdapter`, `MastraVoiceRealtimeAdapter`) wrap a single `MastraVoice` instance provided by downstream. A `VoiceBusiness` layer orchestrates TTS/STT with error wrapping. An app layer exposes REST endpoints and mediator clients for monolith/microservice deployment.

**Tech Stack:** TypeScript, Vitest, Zod, `@mastra/core/voice`, `@sanamyvn/foundation` (DI, mediator)

**Spec:** `docs/superpowers/specs/2026-03-16-voice-module-design.md`

---

## Chunk 1: SDK Layer — Voice Adapter Interfaces, Implementations & Tests

### Task 1: Add Voice Interfaces and DI Tokens to `mastra.interface.ts`

**Files:**
- Modify: `src/business/sdk/mastra/mastra.interface.ts`

- [ ] **Step 1: Add voice type imports and interfaces**

Add the following at the end of `src/business/sdk/mastra/mastra.interface.ts`, after the existing RAG tokens:

```typescript
import type { MastraVoice } from '@mastra/core/voice';

// ── Voice Types ──

export interface SpeakOptions {
  readonly speaker?: string;
  readonly [key: string]: unknown;
}

export interface VoiceSessionOptions {
  readonly [key: string]: unknown;
}

export type VoiceEventCallback = (data: unknown) => void;

// ── TTS Interface ──

/** Abstraction over Mastra Voice for text-to-speech operations. */
export interface IMastraVoiceTts {
  /**
   * Convert text to speech.
   * @param input - Text or text stream to convert.
   * @param options - Optional speaker and provider-specific options.
   * @returns Audio stream, or void if the provider emits audio via events.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  textToSpeech(
    input: string | NodeJS.ReadableStream,
    options?: SpeakOptions,
  ): Promise<NodeJS.ReadableStream | void>;

  /**
   * List available voices from the provider.
   * @returns Array of available voice IDs and metadata.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  getSpeakers(): Promise<Array<{ voiceId: string; [key: string]: unknown }>>;
}

// ── STT Interface ──

/** Abstraction over Mastra Voice for speech-to-text operations. */
export interface IMastraVoiceStt {
  /**
   * Convert speech to text.
   * @param audioStream - Audio stream to transcribe.
   * @param options - Provider-specific transcription options.
   * @returns Transcribed text, a text stream, or void if the provider emits text via events.
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  speechToText(
    audioStream: NodeJS.ReadableStream,
    options?: Record<string, unknown>,
  ): Promise<string | NodeJS.ReadableStream | void>;

  /**
   * Check whether the voice provider supports listening (STT).
   * @throws {MastraAdapterError} When the underlying Mastra call fails.
   */
  getListener(): Promise<{ enabled: boolean }>;
}

// ── Realtime Interface ──

/** Abstraction over Mastra Voice for realtime speech-to-speech session management. */
export interface IMastraVoiceRealtime {
  /** Open a realtime voice session (connects to the provider via WebSocket). */
  openSession(options?: VoiceSessionOptions): Promise<void>;
  /** Close the realtime voice session. */
  closeSession(): void;
  /** Stream audio data to the provider for realtime processing. */
  sendAudio(audioData: NodeJS.ReadableStream | Int16Array): Promise<void>;
  /** Send text to the provider (in STS, the provider speaks it via events). */
  sendText(text: string): Promise<void>;
  /** Manually trigger the provider to generate a response (for push-to-talk without VAD). */
  triggerResponse(options?: Record<string, unknown>): Promise<void>;
  /** Register a listener for voice events (speaker, writing, error, etc.). */
  onEvent(event: string, callback: VoiceEventCallback): void;
  /** Remove a voice event listener. */
  offEvent(event: string, callback: VoiceEventCallback): void;
  /** Add tools the provider can invoke during a realtime session. */
  addTools(tools: Record<string, unknown>): void;
  /** Set system instructions for the realtime session. */
  addInstructions(instructions: string): void;
  /** Update provider configuration at runtime. */
  updateConfig(options: Record<string, unknown>): void;
}

// ── Voice DI Tokens ──

/** DI token for the application-level Mastra TTS adapter. */
export const MASTRA_VOICE_TTS = createToken<IMastraVoiceTts>('MASTRA_VOICE_TTS');

/** DI token for the application-level Mastra STT adapter. */
export const MASTRA_VOICE_STT = createToken<IMastraVoiceStt>('MASTRA_VOICE_STT');

/** DI token for the application-level Mastra Realtime adapter. */
export const MASTRA_VOICE_REALTIME = createToken<IMastraVoiceRealtime>('MASTRA_VOICE_REALTIME');

/** DI token for the raw Mastra Voice instance — provided by the downstream app. */
export const MASTRA_CORE_VOICE = createToken<MastraVoice>('MASTRA_CORE_VOICE');
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors related to the new interfaces.

- [ ] **Step 3: Commit**

```bash
git add src/business/sdk/mastra/mastra.interface.ts
git commit -m "feat(voice): add IMastraVoiceTts, IMastraVoiceStt, IMastraVoiceRealtime interfaces and DI tokens"
```

---

### Task 2: Implement TTS Adapter with Tests

**Files:**
- Create: `src/business/sdk/mastra/adapters/mastra.voice-tts.ts`
- Create: `src/business/sdk/mastra/adapters/mastra.voice-tts.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/business/sdk/mastra/adapters/mastra.voice-tts.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MastraVoiceTtsAdapter } from './mastra.voice-tts.js';
import { MastraAdapterError } from '../mastra.error.js';
import { Readable } from 'node:stream';

function createMockVoice() {
  return {
    speak: vi.fn(),
    getSpeakers: vi.fn(),
  };
}

describe('MastraVoiceTtsAdapter', () => {
  let mockVoice: ReturnType<typeof createMockVoice>;
  let adapter: MastraVoiceTtsAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVoice = createMockVoice();
    adapter = new MastraVoiceTtsAdapter(mockVoice as never);
  });

  describe('textToSpeech', () => {
    it('delegates to voice.speak and returns the audio stream', async () => {
      const audioStream = new Readable({ read() {} });
      mockVoice.speak.mockResolvedValue(audioStream);

      const result = await adapter.textToSpeech('hello', { speaker: 'nova' });

      expect(mockVoice.speak).toHaveBeenCalledWith('hello', { speaker: 'nova' });
      expect(result).toBe(audioStream);
    });

    it('returns void when provider returns void', async () => {
      mockVoice.speak.mockResolvedValue(undefined);

      const result = await adapter.textToSpeech('hello');

      expect(result).toBeUndefined();
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.speak.mockRejectedValue(new Error('provider error'));

      await expect(adapter.textToSpeech('hello')).rejects.toThrow(MastraAdapterError);
      await expect(adapter.textToSpeech('hello')).rejects.toThrow(/textToSpeech/);
    });
  });

  describe('getSpeakers', () => {
    it('delegates to voice.getSpeakers', async () => {
      const speakers = [{ voiceId: 'alloy' }, { voiceId: 'nova' }];
      mockVoice.getSpeakers.mockResolvedValue(speakers);

      const result = await adapter.getSpeakers();

      expect(result).toEqual(speakers);
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.getSpeakers.mockRejectedValue(new Error('provider error'));

      await expect(adapter.getSpeakers()).rejects.toThrow(MastraAdapterError);
      await expect(adapter.getSpeakers()).rejects.toThrow(/getSpeakers/);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit src/business/sdk/mastra/adapters/mastra.voice-tts.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the TTS adapter**

Create `src/business/sdk/mastra/adapters/mastra.voice-tts.ts`:

```typescript
import type { MastraVoice } from '@mastra/core/voice';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_VOICE } from '../mastra.interface.js';
import type { IMastraVoiceTts, SpeakOptions } from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/core` voice instance behind the stable `IMastraVoiceTts`
 * interface. All exceptions from Mastra are caught and re-thrown as
 * `MastraAdapterError`.
 */
@Injectable()
export class MastraVoiceTtsAdapter implements IMastraVoiceTts {
  constructor(@Inject(MASTRA_CORE_VOICE) private readonly voice: MastraVoice) {}

  async textToSpeech(
    input: string | NodeJS.ReadableStream,
    options?: SpeakOptions,
  ): Promise<NodeJS.ReadableStream | void> {
    try {
      return await this.voice.speak(input, options);
    } catch (error) {
      throw new MastraAdapterError('textToSpeech', error);
    }
  }

  async getSpeakers(): Promise<Array<{ voiceId: string; [key: string]: unknown }>> {
    try {
      return await this.voice.getSpeakers();
    } catch (error) {
      throw new MastraAdapterError('getSpeakers', error);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run --project unit src/business/sdk/mastra/adapters/mastra.voice-tts.spec.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/business/sdk/mastra/adapters/mastra.voice-tts.ts src/business/sdk/mastra/adapters/mastra.voice-tts.spec.ts
git commit -m "feat(voice): add MastraVoiceTtsAdapter with tests"
```

---

### Task 3: Implement STT Adapter with Tests

**Files:**
- Create: `src/business/sdk/mastra/adapters/mastra.voice-stt.ts`
- Create: `src/business/sdk/mastra/adapters/mastra.voice-stt.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/business/sdk/mastra/adapters/mastra.voice-stt.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MastraVoiceSttAdapter } from './mastra.voice-stt.js';
import { MastraAdapterError } from '../mastra.error.js';
import { Readable } from 'node:stream';

function createMockVoice() {
  return {
    listen: vi.fn(),
    getListener: vi.fn(),
  };
}

describe('MastraVoiceSttAdapter', () => {
  let mockVoice: ReturnType<typeof createMockVoice>;
  let adapter: MastraVoiceSttAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVoice = createMockVoice();
    adapter = new MastraVoiceSttAdapter(mockVoice as never);
  });

  describe('speechToText', () => {
    it('delegates to voice.listen and returns the text', async () => {
      mockVoice.listen.mockResolvedValue('hello world');
      const audioStream = new Readable({ read() {} });

      const result = await adapter.speechToText(audioStream, { filetype: 'mp3' });

      expect(mockVoice.listen).toHaveBeenCalledWith(audioStream, { filetype: 'mp3' });
      expect(result).toBe('hello world');
    });

    it('returns a stream when provider returns a stream', async () => {
      const textStream = new Readable({ read() {} });
      mockVoice.listen.mockResolvedValue(textStream);
      const audioStream = new Readable({ read() {} });

      const result = await adapter.speechToText(audioStream);

      expect(result).toBe(textStream);
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.listen.mockRejectedValue(new Error('provider error'));
      const audioStream = new Readable({ read() {} });

      await expect(adapter.speechToText(audioStream)).rejects.toThrow(MastraAdapterError);
      await expect(adapter.speechToText(audioStream)).rejects.toThrow(/speechToText/);
    });
  });

  describe('getListener', () => {
    it('delegates to voice.getListener', async () => {
      mockVoice.getListener.mockResolvedValue({ enabled: true });

      const result = await adapter.getListener();

      expect(result).toEqual({ enabled: true });
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.getListener.mockRejectedValue(new Error('provider error'));

      await expect(adapter.getListener()).rejects.toThrow(MastraAdapterError);
      await expect(adapter.getListener()).rejects.toThrow(/getListener/);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit src/business/sdk/mastra/adapters/mastra.voice-stt.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the STT adapter**

Create `src/business/sdk/mastra/adapters/mastra.voice-stt.ts`:

```typescript
import type { MastraVoice } from '@mastra/core/voice';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_VOICE } from '../mastra.interface.js';
import type { IMastraVoiceStt } from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/core` voice instance behind the stable `IMastraVoiceStt`
 * interface. All exceptions from Mastra are caught and re-thrown as
 * `MastraAdapterError`.
 */
@Injectable()
export class MastraVoiceSttAdapter implements IMastraVoiceStt {
  constructor(@Inject(MASTRA_CORE_VOICE) private readonly voice: MastraVoice) {}

  async speechToText(
    audioStream: NodeJS.ReadableStream,
    options?: Record<string, unknown>,
  ): Promise<string | NodeJS.ReadableStream | void> {
    try {
      return await this.voice.listen(audioStream, options);
    } catch (error) {
      throw new MastraAdapterError('speechToText', error);
    }
  }

  async getListener(): Promise<{ enabled: boolean }> {
    try {
      return await this.voice.getListener();
    } catch (error) {
      throw new MastraAdapterError('getListener', error);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run --project unit src/business/sdk/mastra/adapters/mastra.voice-stt.spec.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/business/sdk/mastra/adapters/mastra.voice-stt.ts src/business/sdk/mastra/adapters/mastra.voice-stt.spec.ts
git commit -m "feat(voice): add MastraVoiceSttAdapter with tests"
```

---

### Task 4: Implement Realtime Adapter with Tests

**Files:**
- Create: `src/business/sdk/mastra/adapters/mastra.voice-realtime.ts`
- Create: `src/business/sdk/mastra/adapters/mastra.voice-realtime.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/business/sdk/mastra/adapters/mastra.voice-realtime.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MastraVoiceRealtimeAdapter } from './mastra.voice-realtime.js';
import { MastraAdapterError } from '../mastra.error.js';
import { Readable } from 'node:stream';

function createMockVoice() {
  return {
    connect: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    speak: vi.fn(),
    answer: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    addTools: vi.fn(),
    addInstructions: vi.fn(),
    updateConfig: vi.fn(),
  };
}

describe('MastraVoiceRealtimeAdapter', () => {
  let mockVoice: ReturnType<typeof createMockVoice>;
  let adapter: MastraVoiceRealtimeAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVoice = createMockVoice();
    adapter = new MastraVoiceRealtimeAdapter(mockVoice as never);
  });

  describe('openSession', () => {
    it('delegates to voice.connect', async () => {
      mockVoice.connect.mockResolvedValue(undefined);

      await adapter.openSession({ timeout: 5000 });

      expect(mockVoice.connect).toHaveBeenCalledWith({ timeout: 5000 });
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.connect.mockRejectedValue(new Error('ws error'));

      await expect(adapter.openSession()).rejects.toThrow(MastraAdapterError);
      await expect(adapter.openSession()).rejects.toThrow(/openSession/);
    });
  });

  describe('closeSession', () => {
    it('delegates to voice.close', () => {
      adapter.closeSession();
      expect(mockVoice.close).toHaveBeenCalled();
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.close.mockImplementation(() => {
        throw new Error('close error');
      });

      expect(() => adapter.closeSession()).toThrow(MastraAdapterError);
    });
  });

  describe('sendAudio', () => {
    it('delegates to voice.send with a stream', async () => {
      mockVoice.send.mockResolvedValue(undefined);
      const audioStream = new Readable({ read() {} });

      await adapter.sendAudio(audioStream);

      expect(mockVoice.send).toHaveBeenCalledWith(audioStream);
    });

    it('delegates to voice.send with Int16Array', async () => {
      mockVoice.send.mockResolvedValue(undefined);
      const audioData = new Int16Array([1, 2, 3]);

      await adapter.sendAudio(audioData);

      expect(mockVoice.send).toHaveBeenCalledWith(audioData);
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.send.mockRejectedValue(new Error('send error'));

      await expect(adapter.sendAudio(new Int16Array())).rejects.toThrow(MastraAdapterError);
    });
  });

  describe('sendText', () => {
    it('delegates to voice.speak', async () => {
      mockVoice.speak.mockResolvedValue(undefined);

      await adapter.sendText('hello');

      expect(mockVoice.speak).toHaveBeenCalledWith('hello');
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.speak.mockRejectedValue(new Error('speak error'));

      await expect(adapter.sendText('hello')).rejects.toThrow(MastraAdapterError);
    });
  });

  describe('triggerResponse', () => {
    it('delegates to voice.answer', async () => {
      mockVoice.answer.mockResolvedValue(undefined);

      await adapter.triggerResponse({ force: true });

      expect(mockVoice.answer).toHaveBeenCalledWith({ force: true });
    });

    it('wraps errors as MastraAdapterError', async () => {
      mockVoice.answer.mockRejectedValue(new Error('answer error'));

      await expect(adapter.triggerResponse()).rejects.toThrow(MastraAdapterError);
    });
  });

  describe('onEvent', () => {
    it('delegates to voice.on', () => {
      const cb = vi.fn();
      adapter.onEvent('speaker', cb);
      expect(mockVoice.on).toHaveBeenCalledWith('speaker', cb);
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.on.mockImplementation(() => {
        throw new Error('on error');
      });

      expect(() => adapter.onEvent('speaker', vi.fn())).toThrow(MastraAdapterError);
    });
  });

  describe('offEvent', () => {
    it('delegates to voice.off', () => {
      const cb = vi.fn();
      adapter.offEvent('speaker', cb);
      expect(mockVoice.off).toHaveBeenCalledWith('speaker', cb);
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.off.mockImplementation(() => {
        throw new Error('off error');
      });

      expect(() => adapter.offEvent('speaker', vi.fn())).toThrow(MastraAdapterError);
    });
  });

  describe('addTools', () => {
    it('delegates to voice.addTools', () => {
      const tools = { search: {} };
      adapter.addTools(tools);
      expect(mockVoice.addTools).toHaveBeenCalledWith(tools);
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.addTools.mockImplementation(() => {
        throw new Error('tools error');
      });

      expect(() => adapter.addTools({})).toThrow(MastraAdapterError);
    });
  });

  describe('addInstructions', () => {
    it('delegates to voice.addInstructions', () => {
      adapter.addInstructions('Be helpful');
      expect(mockVoice.addInstructions).toHaveBeenCalledWith('Be helpful');
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.addInstructions.mockImplementation(() => {
        throw new Error('instructions error');
      });

      expect(() => adapter.addInstructions('Be helpful')).toThrow(MastraAdapterError);
    });
  });

  describe('updateConfig', () => {
    it('delegates to voice.updateConfig', () => {
      adapter.updateConfig({ model: 'gpt-5.1-realtime' });
      expect(mockVoice.updateConfig).toHaveBeenCalledWith({ model: 'gpt-5.1-realtime' });
    });

    it('wraps errors as MastraAdapterError', () => {
      mockVoice.updateConfig.mockImplementation(() => {
        throw new Error('config error');
      });

      expect(() => adapter.updateConfig({})).toThrow(MastraAdapterError);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit src/business/sdk/mastra/adapters/mastra.voice-realtime.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the Realtime adapter**

Create `src/business/sdk/mastra/adapters/mastra.voice-realtime.ts`:

```typescript
import type { MastraVoice } from '@mastra/core/voice';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_VOICE } from '../mastra.interface.js';
import type { IMastraVoiceRealtime, VoiceSessionOptions, VoiceEventCallback } from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/core` voice instance behind the stable `IMastraVoiceRealtime`
 * interface for realtime speech-to-speech session management. All exceptions
 * from Mastra are caught and re-thrown as `MastraAdapterError`.
 */
@Injectable()
export class MastraVoiceRealtimeAdapter implements IMastraVoiceRealtime {
  constructor(@Inject(MASTRA_CORE_VOICE) private readonly voice: MastraVoice) {}

  async openSession(options?: VoiceSessionOptions): Promise<void> {
    try {
      await this.voice.connect(options);
    } catch (error) {
      throw new MastraAdapterError('openSession', error);
    }
  }

  closeSession(): void {
    try {
      this.voice.close();
    } catch (error) {
      throw new MastraAdapterError('closeSession', error);
    }
  }

  async sendAudio(audioData: NodeJS.ReadableStream | Int16Array): Promise<void> {
    try {
      await this.voice.send(audioData);
    } catch (error) {
      throw new MastraAdapterError('sendAudio', error);
    }
  }

  async sendText(text: string): Promise<void> {
    try {
      await this.voice.speak(text);
    } catch (error) {
      throw new MastraAdapterError('sendText', error);
    }
  }

  async triggerResponse(options?: Record<string, unknown>): Promise<void> {
    try {
      await this.voice.answer(options);
    } catch (error) {
      throw new MastraAdapterError('triggerResponse', error);
    }
  }

  onEvent(event: string, callback: VoiceEventCallback): void {
    try {
      this.voice.on(event, callback);
    } catch (error) {
      throw new MastraAdapterError('onEvent', error);
    }
  }

  offEvent(event: string, callback: VoiceEventCallback): void {
    try {
      this.voice.off(event, callback);
    } catch (error) {
      throw new MastraAdapterError('offEvent', error);
    }
  }

  addTools(tools: Record<string, unknown>): void {
    try {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this.voice.addTools(tools as never);
    } catch (error) {
      throw new MastraAdapterError('addTools', error);
    }
  }

  addInstructions(instructions: string): void {
    try {
      this.voice.addInstructions(instructions);
    } catch (error) {
      throw new MastraAdapterError('addInstructions', error);
    }
  }

  updateConfig(options: Record<string, unknown>): void {
    try {
      this.voice.updateConfig(options);
    } catch (error) {
      throw new MastraAdapterError('updateConfig', error);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run --project unit src/business/sdk/mastra/adapters/mastra.voice-realtime.spec.ts`
Expected: All 18 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/business/sdk/mastra/adapters/mastra.voice-realtime.ts src/business/sdk/mastra/adapters/mastra.voice-realtime.spec.ts
git commit -m "feat(voice): add MastraVoiceRealtimeAdapter with tests"
```

---

### Task 5: Update Providers and Testing Utilities

**Files:**
- Modify: `src/business/sdk/mastra/mastra.providers.ts`
- Modify: `src/business/sdk/mastra/mastra.testing.ts`

- [ ] **Step 1: Update `mastra.providers.ts`**

Add imports for the three new adapters and their tokens, then add them to the `providers` and `exports` arrays:

```typescript
import { MASTRA_VOICE_TTS, MASTRA_VOICE_STT, MASTRA_VOICE_REALTIME } from './mastra.interface.js';
import { MastraVoiceTtsAdapter } from './adapters/mastra.voice-tts.js';
import { MastraVoiceSttAdapter } from './adapters/mastra.voice-stt.js';
import { MastraVoiceRealtimeAdapter } from './adapters/mastra.voice-realtime.js';
```

Add to `providers` array:
```typescript
bind(MASTRA_VOICE_TTS, MastraVoiceTtsAdapter),
bind(MASTRA_VOICE_STT, MastraVoiceSttAdapter),
bind(MASTRA_VOICE_REALTIME, MastraVoiceRealtimeAdapter),
```

Add to `exports` array:
```typescript
MASTRA_VOICE_TTS, MASTRA_VOICE_STT, MASTRA_VOICE_REALTIME,
```

- [ ] **Step 2: Update `mastra.testing.ts`**

Add imports and mock factories:

```typescript
import type { IMastraVoiceTts, IMastraVoiceStt, IMastraVoiceRealtime } from './mastra.interface.js';

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
```

- [ ] **Step 3: Verify all existing tests still pass**

Run: `pnpm vitest run --project unit`
Expected: All tests PASS (no regressions).

- [ ] **Step 4: Commit**

```bash
git add src/business/sdk/mastra/mastra.providers.ts src/business/sdk/mastra/mastra.testing.ts
git commit -m "feat(voice): register voice adapters in providers and add mock factories"
```

---

## Chunk 2: Business Layer — Voice Domain

### Task 6: Voice Domain Models and Errors

**Files:**
- Create: `src/business/domain/voice/voice.model.ts`
- Create: `src/business/domain/voice/voice.error.ts`

- [ ] **Step 1: Create voice models**

Create `src/business/domain/voice/voice.model.ts`:

```typescript
export interface TextToSpeechInput {
  readonly text: string;
  readonly speaker?: string;
  readonly options?: Record<string, unknown>;
}

export interface TextToSpeechResult {
  readonly audioStream: NodeJS.ReadableStream;
}

export interface SpeechToTextInput {
  readonly audioStream: NodeJS.ReadableStream;
  readonly options?: Record<string, unknown>;
}

export interface SpeechToTextResult {
  readonly text: string;
}

export interface Speaker {
  readonly voiceId: string;
  readonly [key: string]: unknown;
}

export interface GetSpeakersResult {
  readonly speakers: Speaker[];
}
```

- [ ] **Step 2: Create voice errors**

Create `src/business/domain/voice/voice.error.ts`:

```typescript
/** Base error for all Voice business layer failures. */
export class VoiceBusinessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a text-to-speech operation fails. */
export class VoiceTtsError extends VoiceBusinessError {
  constructor(message: string, cause?: unknown) {
    super(`Voice TTS failed: ${message}`, { cause });
  }
}

/** Thrown when a speech-to-text operation fails. */
export class VoiceSttError extends VoiceBusinessError {
  constructor(message: string, cause?: unknown) {
    super(`Voice STT failed: ${message}`, { cause });
  }
}

/** Type guard for {@link VoiceTtsError}. */
export function isVoiceTtsError(error: unknown): error is VoiceTtsError {
  return error instanceof VoiceTtsError;
}

/** Type guard for {@link VoiceSttError}. */
export function isVoiceSttError(error: unknown): error is VoiceSttError {
  return error instanceof VoiceSttError;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/business/domain/voice/voice.model.ts src/business/domain/voice/voice.error.ts
git commit -m "feat(voice): add voice domain models and error classes"
```

---

### Task 7: Voice Business Interface and Implementation with Tests

**Files:**
- Create: `src/business/domain/voice/voice.interface.ts`
- Create: `src/business/domain/voice/voice.business.ts`
- Create: `src/business/domain/voice/voice.business.spec.ts`

- [ ] **Step 1: Create the business interface**

Create `src/business/domain/voice/voice.interface.ts`:

```typescript
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { TextToSpeechInput, TextToSpeechResult, SpeechToTextInput, SpeechToTextResult, GetSpeakersResult } from './voice.model.js';

/** Abstraction over voice operations for text-to-speech and speech-to-text. */
export interface IVoiceBusiness {
  /** Convert text to an audio stream. */
  textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechResult>;
  /** Convert an audio stream to text. */
  speechToText(input: SpeechToTextInput): Promise<SpeechToTextResult>;
  /** List available voice speakers. */
  getSpeakers(): Promise<GetSpeakersResult>;
}

/** DI token for the Voice business service. */
export const VOICE_BUSINESS = createToken<IVoiceBusiness>('VOICE_BUSINESS');
```

- [ ] **Step 2: Write the failing tests**

Create `src/business/domain/voice/voice.business.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceBusiness } from './voice.business.js';
import { VoiceTtsError, VoiceSttError } from './voice.error.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { createMockMastraVoiceTts, createMockMastraVoiceStt } from '@/business/sdk/mastra/mastra.testing.js';
import { Readable } from 'node:stream';

describe('VoiceBusiness', () => {
  let mockTts: ReturnType<typeof createMockMastraVoiceTts>;
  let mockStt: ReturnType<typeof createMockMastraVoiceStt>;
  let business: VoiceBusiness;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTts = createMockMastraVoiceTts();
    mockStt = createMockMastraVoiceStt();
    business = new VoiceBusiness(mockTts, mockStt);
  });

  describe('textToSpeech', () => {
    it('delegates to TTS adapter and returns audio stream', async () => {
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);

      const result = await business.textToSpeech({ text: 'hello', speaker: 'nova' });

      expect(mockTts.textToSpeech).toHaveBeenCalledWith('hello', { speaker: 'nova' });
      expect(result.audioStream).toBe(audioStream);
    });

    it('passes provider-specific options', async () => {
      const audioStream = new Readable({ read() {} });
      mockTts.textToSpeech.mockResolvedValue(audioStream);

      await business.textToSpeech({ text: 'hello', options: { speed: 1.5 } });

      expect(mockTts.textToSpeech).toHaveBeenCalledWith('hello', { speed: 1.5 });
    });

    it('throws VoiceTtsError when provider returns void', async () => {
      mockTts.textToSpeech.mockResolvedValue(undefined);

      await expect(business.textToSpeech({ text: 'hello' })).rejects.toThrow(VoiceTtsError);
    });

    it('wraps adapter errors as VoiceTtsError', async () => {
      mockTts.textToSpeech.mockRejectedValue(
        new MastraAdapterError('textToSpeech', new Error('provider error')),
      );

      await expect(business.textToSpeech({ text: 'hello' })).rejects.toThrow(VoiceTtsError);
    });
  });

  describe('speechToText', () => {
    it('returns text when provider returns string', async () => {
      mockStt.speechToText.mockResolvedValue('hello world');
      const audioStream = new Readable({ read() {} });

      const result = await business.speechToText({ audioStream });

      expect(result).toEqual({ text: 'hello world' });
    });

    it('collects stream when provider returns a stream', async () => {
      const textStream = new Readable({
        read() {
          this.push('hello ');
          this.push('world');
          this.push(null);
        },
      });
      mockStt.speechToText.mockResolvedValue(textStream);
      const audioStream = new Readable({ read() {} });

      const result = await business.speechToText({ audioStream });

      expect(result).toEqual({ text: 'hello world' });
    });

    it('throws VoiceSttError when provider returns void', async () => {
      mockStt.speechToText.mockResolvedValue(undefined);
      const audioStream = new Readable({ read() {} });

      await expect(business.speechToText({ audioStream })).rejects.toThrow(VoiceSttError);
    });

    it('wraps adapter errors as VoiceSttError', async () => {
      mockStt.speechToText.mockRejectedValue(
        new MastraAdapterError('speechToText', new Error('provider error')),
      );
      const audioStream = new Readable({ read() {} });

      await expect(business.speechToText({ audioStream })).rejects.toThrow(VoiceSttError);
    });
  });

  describe('getSpeakers', () => {
    it('returns speakers from TTS adapter', async () => {
      const speakers = [{ voiceId: 'alloy' }, { voiceId: 'nova' }];
      mockTts.getSpeakers.mockResolvedValue(speakers);

      const result = await business.getSpeakers();

      expect(result).toEqual({ speakers });
    });

    it('wraps adapter errors as VoiceTtsError', async () => {
      mockTts.getSpeakers.mockRejectedValue(
        new MastraAdapterError('getSpeakers', new Error('provider error')),
      );

      await expect(business.getSpeakers()).rejects.toThrow(VoiceTtsError);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run --project unit src/business/domain/voice/voice.business.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the business layer**

Create `src/business/domain/voice/voice.business.ts`:

```typescript
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_VOICE_TTS, MASTRA_VOICE_STT } from '@/business/sdk/mastra/mastra.interface.js';
import type { IMastraVoiceTts, IMastraVoiceStt } from '@/business/sdk/mastra/mastra.interface.js';
import type { IVoiceBusiness } from './voice.interface.js';
import type {
  TextToSpeechInput,
  TextToSpeechResult,
  SpeechToTextInput,
  SpeechToTextResult,
  GetSpeakersResult,
} from './voice.model.js';
import { VoiceTtsError, VoiceSttError } from './voice.error.js';

@Injectable()
export class VoiceBusiness implements IVoiceBusiness {
  constructor(
    @Inject(MASTRA_VOICE_TTS) private readonly tts: IMastraVoiceTts,
    @Inject(MASTRA_VOICE_STT) private readonly stt: IMastraVoiceStt,
  ) {}

  async textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechResult> {
    try {
      const audioStream = await this.tts.textToSpeech(input.text, {
        speaker: input.speaker,
        ...input.options,
      });
      if (!audioStream) throw new VoiceTtsError('Provider returned no audio stream');
      return { audioStream };
    } catch (error) {
      if (error instanceof VoiceTtsError) throw error;
      throw new VoiceTtsError('textToSpeech', error);
    }
  }

  async speechToText(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    try {
      const result = await this.stt.speechToText(input.audioStream, input.options);
      if (typeof result === 'string') return { text: result };
      if (!result) throw new VoiceSttError('Provider returned no transcription');
      return { text: await this.collectStream(result) };
    } catch (error) {
      if (error instanceof VoiceSttError) throw error;
      throw new VoiceSttError('speechToText', error);
    }
  }

  async getSpeakers(): Promise<GetSpeakersResult> {
    try {
      const speakers = await this.tts.getSpeakers();
      return { speakers };
    } catch (error) {
      throw new VoiceTtsError('getSpeakers', error);
    }
  }

  private async collectStream(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run --project unit src/business/domain/voice/voice.business.spec.ts`
Expected: All 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/business/domain/voice/voice.interface.ts src/business/domain/voice/voice.business.ts src/business/domain/voice/voice.business.spec.ts
git commit -m "feat(voice): add VoiceBusiness with tests"
```

---

### Task 8: Voice Business Providers, Testing Utilities, and Client Contracts

**Files:**
- Create: `src/business/domain/voice/voice.providers.ts`
- Create: `src/business/domain/voice/voice.testing.ts`
- Create: `src/business/domain/voice/client/schemas.ts`
- Create: `src/business/domain/voice/client/queries.ts`
- Create: `src/business/domain/voice/client/errors.ts`
- Create: `src/business/domain/voice/client/mediator.ts`
- Modify: `src/business/providers.ts`

- [ ] **Step 1: Create providers**

Create `src/business/domain/voice/voice.providers.ts`:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { VOICE_BUSINESS } from './voice.interface.js';
import { VoiceBusiness } from './voice.business.js';

export function voiceBusinessProviders() {
  return {
    providers: [bind(VOICE_BUSINESS, VoiceBusiness)],
    exports: [VOICE_BUSINESS],
  };
}
```

- [ ] **Step 2: Create testing utilities**

Create `src/business/domain/voice/voice.testing.ts`:

```typescript
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
```

- [ ] **Step 3: Create client schemas**

Create `src/business/domain/voice/client/schemas.ts`:

```typescript
import { z } from 'zod';

export const textToSpeechClientSchema = z.object({
  text: z.string().min(1),
  speaker: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export const textToSpeechResultSchema = z.object({
  audio: z.string(),
  contentType: z.string(),
});

export const speechToTextClientSchema = z.object({
  audio: z.string(),
  contentType: z.string(),
  options: z.record(z.unknown()).optional(),
});

export const speechToTextResultSchema = z.object({
  text: z.string(),
});

export const getSpeakersResultSchema = z.object({
  speakers: z.array(z.object({ voiceId: z.string() }).passthrough()),
});

export type TextToSpeechClientResult = z.infer<typeof textToSpeechResultSchema>;
export type SpeechToTextClientResult = z.infer<typeof speechToTextResultSchema>;
export type GetSpeakersClientResult = z.infer<typeof getSpeakersResultSchema>;
```

- [ ] **Step 4: Create client queries**

Create `src/business/domain/voice/client/queries.ts`:

```typescript
import { createCommand, createQuery } from '@sanamyvn/foundation/mediator/request';
import {
  textToSpeechClientSchema,
  textToSpeechResultSchema,
  speechToTextClientSchema,
  speechToTextResultSchema,
  getSpeakersResultSchema,
} from './schemas.js';
import { z } from 'zod';

export const VoiceTextToSpeechCommand = createCommand({
  type: 'ai.voice.textToSpeech',
  payload: textToSpeechClientSchema,
  response: textToSpeechResultSchema,
});

export const VoiceSpeechToTextCommand = createCommand({
  type: 'ai.voice.speechToText',
  payload: speechToTextClientSchema,
  response: speechToTextResultSchema,
});

export const VoiceGetSpeakersQuery = createQuery({
  type: 'ai.voice.getSpeakers',
  payload: z.object({}),
  response: getSpeakersResultSchema,
});
```

- [ ] **Step 5: Create client errors**

Create `src/business/domain/voice/client/errors.ts`:

```typescript
/** Base error for Voice mediator client failures. */
export class VoiceClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a TTS mediator operation fails. */
export class VoiceClientTtsError extends VoiceClientError {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

/** Thrown when an STT mediator operation fails. */
export class VoiceClientSttError extends VoiceClientError {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

/** Type guard for {@link VoiceClientError}. */
export function isVoiceClientError(error: unknown): error is VoiceClientError {
  return error instanceof VoiceClientError;
}

/** Type guard for {@link VoiceClientTtsError}. */
export function isVoiceClientTtsError(error: unknown): error is VoiceClientTtsError {
  return error instanceof VoiceClientTtsError;
}

/** Type guard for {@link VoiceClientSttError}. */
export function isVoiceClientSttError(error: unknown): error is VoiceClientSttError {
  return error instanceof VoiceClientSttError;
}
```

- [ ] **Step 6: Create client mediator interface**

Create `src/business/domain/voice/client/mediator.ts`:

```typescript
import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { TextToSpeechClientResult, SpeechToTextClientResult, GetSpeakersClientResult } from './schemas.js';
import { VoiceTextToSpeechCommand, VoiceSpeechToTextCommand, VoiceGetSpeakersQuery } from './queries.js';

export interface IVoiceMediator {
  textToSpeech(command: InstanceType<typeof VoiceTextToSpeechCommand>): Promise<TextToSpeechClientResult>;
  speechToText(command: InstanceType<typeof VoiceSpeechToTextCommand>): Promise<SpeechToTextClientResult>;
  getSpeakers(query: InstanceType<typeof VoiceGetSpeakersQuery>): Promise<GetSpeakersClientResult>;
}

export const VOICE_MEDIATOR = createMediatorToken<IVoiceMediator>('VOICE_MEDIATOR', {
  textToSpeech: VoiceTextToSpeechCommand,
  speechToText: VoiceSpeechToTextCommand,
  getSpeakers: VoiceGetSpeakersQuery,
});
```

- [ ] **Step 7: Update `src/business/providers.ts`**

Add import at the top:
```typescript
import { voiceBusinessProviders } from './domain/voice/voice.providers.js';
```

Inside `aiBusinessProviders()`, add:
```typescript
const voice = voiceBusinessProviders();
```

Then spread `...voice.providers` into the `providers` array and `...voice.exports` into the `exports` array, following the existing RAG pattern.

- [ ] **Step 8: Verify TypeScript compiles and all tests pass**

Run: `pnpm tsc --noEmit && pnpm vitest run --project unit`
Expected: No compile errors, all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/business/domain/voice/ src/business/providers.ts
git commit -m "feat(voice): add voice business providers, testing utilities, and client contracts"
```

---

## Chunk 3: App Layer — Voice REST Endpoints & Mediator Clients

### Task 9: App Layer DTOs, Errors, Tokens, and Mapper

**Files:**
- Create: `src/app/domain/voice/voice.dto.ts`
- Create: `src/app/domain/voice/voice.error.ts`
- Create: `src/app/domain/voice/voice.tokens.ts`
- Create: `src/app/domain/voice/voice.mapper.ts`

- [ ] **Step 1: Create DTOs**

Create `src/app/domain/voice/voice.dto.ts`:

```typescript
import { z } from 'zod';

export const textToSpeechRequestDto = z.object({
  text: z.string().min(1),
  speaker: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});
export type TextToSpeechRequestDto = z.infer<typeof textToSpeechRequestDto>;

export const speechToTextResponseDto = z.object({
  text: z.string(),
});
export type SpeechToTextResponseDto = z.infer<typeof speechToTextResponseDto>;

export const getSpeakersResponseDto = z.object({
  speakers: z.array(z.object({ voiceId: z.string() }).passthrough()),
});
export type GetSpeakersResponseDto = z.infer<typeof getSpeakersResponseDto>;
```

- [ ] **Step 2: Create HTTP errors**

Create `src/app/domain/voice/voice.error.ts`:

```typescript
import { isVoiceTtsError, isVoiceSttError } from '@/business/domain/voice/voice.error.js';
import { isVoiceClientTtsError, isVoiceClientSttError } from '@/business/domain/voice/client/errors.js';

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
```

- [ ] **Step 3: Create middleware tokens**

Create `src/app/domain/voice/voice.tokens.ts`:

```typescript
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/middleware';

export interface VoiceMiddlewareConfig {
  readonly textToSpeech?: MiddlewareInput[];
  readonly speechToText?: MiddlewareInput[];
  readonly getSpeakers?: MiddlewareInput[];
}

export const VOICE_MIDDLEWARE_CONFIG = createToken<VoiceMiddlewareConfig>('VOICE_MIDDLEWARE_CONFIG');
```

- [ ] **Step 4: Create mapper**

Create `src/app/domain/voice/voice.mapper.ts`:

```typescript
import type { GetSpeakersClientResult, SpeechToTextClientResult } from '@/business/domain/voice/client/schemas.js';
import type { SpeechToTextResponseDto, GetSpeakersResponseDto } from './voice.dto.js';

export function toSpeechToTextResponseDto(result: SpeechToTextClientResult): SpeechToTextResponseDto {
  return { text: result.text };
}

export function toGetSpeakersResponseDto(result: GetSpeakersClientResult): GetSpeakersResponseDto {
  return { speakers: result.speakers };
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/domain/voice/
git commit -m "feat(voice): add app layer DTOs, errors, tokens, and mapper"
```

---

### Task 10: App Service, Router, Providers, and Module

**Files:**
- Create: `src/app/domain/voice/voice.service.ts`
- Create: `src/app/domain/voice/voice.router.ts`
- Create: `src/app/domain/voice/voice.providers.ts`
- Create: `src/app/domain/voice/voice.module.ts`
- Modify: `src/app/providers.ts`

These files follow the exact patterns from the RAG and Conversation domains. Refer to `src/app/domain/rag/` for the closest reference. The service calls the mediator, the router registers endpoints, the module provides `forRoot()`.

Implementation details are the same as shown in the spec's App Layer section. The router registers:
- `POST /ai/voice/text-to-speech` — pipes audio stream response
- `POST /ai/voice/speech-to-text` — multipart upload, returns JSON
- `GET /ai/voice/speakers` — returns JSON

- [ ] **Step 1: Create `voice.service.ts`**

Follow `src/app/domain/rag/rag.service.ts` pattern. The service:
- Injects the mediator via `@Inject(AI_MEDIATOR)`
- `textToSpeech(dto)` → dispatches `VoiceTextToSpeechCommand`, receives base64 audio result
- `speechToText(dto)` → dispatches `VoiceSpeechToTextCommand`, receives text result
- `getSpeakers()` → dispatches `VoiceGetSpeakersQuery`
- Calls `mapVoiceError()` in catch blocks

- [ ] **Step 2: Create `voice.router.ts`**

Follow `src/app/domain/rag/rag.router.ts` pattern. Key differences from RAG:

**TTS endpoint (`POST /ai/voice/text-to-speech`):**
- Accepts JSON body (`textToSpeechRequestDto`)
- The service returns `{ audio: string, contentType: string }` (base64 from mediator)
- The router decodes base64 to a Buffer, sets `Content-Type` header from `contentType`, and writes the buffer to the response
- This streams binary audio back to the client, not JSON

**STT endpoint (`POST /ai/voice/speech-to-text`):**
- Accepts multipart form upload with an audio file field
- Reads the uploaded file buffer, base64-encodes it, and passes to service as `{ audio: base64, contentType: mimetype }`
- Returns JSON `{ text: string }`

**Speakers endpoint (`GET /ai/voice/speakers`):**
- Standard JSON response, same pattern as RAG

- [ ] **Step 3: Create `voice.providers.ts` and `voice.module.ts`**

Follow `src/app/domain/rag/rag.providers.ts` and `src/app/domain/rag/rag.module.ts` patterns exactly. Module exposes `forRoot(options)` accepting `VoiceMiddlewareConfig`.

- [ ] **Step 4: Update `src/app/providers.ts`**

Add import and spread for `voiceAppProviders`, same pattern as RAG.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/domain/voice/ src/app/providers.ts
git commit -m "feat(voice): add app layer service, router, providers, and module"
```

---

### Task 11: Mediator Clients (Local & Remote)

**Files:**
- Create: `src/app/sdk/voice-client/voice-local.mediator.ts`
- Create: `src/app/sdk/voice-client/voice-remote.mediator.ts`
- Create: `src/app/sdk/voice-client/voice.mapper.ts`
- Create: `src/app/sdk/voice-client/voice-client.module.ts`

These follow the exact patterns from `src/app/sdk/rag-client/` or `src/app/sdk/conversation-client/`.

- [ ] **Step 1: Create `voice.mapper.ts`**

Converts between business and client types. Key concern: `VoiceBusiness.textToSpeech()` returns `{ audioStream: ReadableStream }`, but the mediator contract requires `{ audio: string, contentType: string }`. The mapper must:
- Collect the `ReadableStream` into a `Buffer`
- Base64-encode it
- Return `{ audio: base64String, contentType: 'audio/mpeg' }` (default content type; can be made configurable later)

```typescript
export async function toTextToSpeechClientResult(
  result: TextToSpeechResult,
): Promise<TextToSpeechClientResult> {
  const chunks: Buffer[] = [];
  for await (const chunk of result.audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  return {
    audio: Buffer.concat(chunks).toString('base64'),
    contentType: 'audio/mpeg',
  };
}
```

- [ ] **Step 2: Create `voice-local.mediator.ts`**

Follow `src/app/sdk/rag-client/` pattern. Injects `IVoiceBusiness` directly:
- `textToSpeech(cmd)` → calls `business.textToSpeech()`, then uses mapper to convert `ReadableStream` → base64
- `speechToText(cmd)` → decodes base64 audio from command payload into a `Readable` stream, passes to `business.speechToText()`
- `getSpeakers(query)` → delegates directly

- [ ] **Step 3: Create `voice-remote.mediator.ts`**

Follow existing remote mediator pattern. Makes HTTP calls to the voice service:
- `textToSpeech` → `POST /ai/voice/text-to-speech`, receives binary response, base64-encodes it
- `speechToText` → `POST /ai/voice/speech-to-text`, sends multipart with base64-decoded audio buffer
- `getSpeakers` → `GET /ai/voice/speakers`, standard JSON

- [ ] **Step 4: Create `voice-client.module.ts`**

Follow `src/app/sdk/rag-client/` pattern. Exposes `voiceClientMonolithProviders()` and `voiceClientStandaloneProviders(options)`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/sdk/voice-client/
git commit -m "feat(voice): add voice mediator clients (local and remote)"
```

---

### Task 12: Package Exports and Final Verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add voice export entries to `package.json`**

Add these entries to the `exports` field, matching the exact `types`/`default` path pattern used by the existing RAG entries. Copy an existing RAG export, replace `rag` with `voice`, and adjust the file path:

```
"./business/voice"
"./business/voice/model"
"./business/voice/error"
"./business/voice/providers"
"./business/voice/testing"
"./business/voice/client/schemas"
"./business/voice/client/queries"
"./business/voice/client/errors"
"./business/voice/client/mediator"
"./app/voice/module"
"./app/voice/providers"
"./app/voice-client/module"
```

Each entry follows the same shape as existing RAG exports (e.g., `"./business/rag"` → `"./business/voice"`).

- [ ] **Step 2: Run full test suite**

Run: `pnpm vitest run --project unit`
Expected: All tests PASS, including the new voice adapter and business tests.

- [ ] **Step 3: Run TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat(voice): add package exports for voice module"
```
