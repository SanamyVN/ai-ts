# Realtime Voice Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic realtime voice conversation pipeline using open-source models (Silero VAD, Whisper STT, Kokoro TTS) running natively in Node.js, orchestrated through the mediator pattern.

**Architecture:** Three new SDK adapters (Silero → `IVad`, Whisper → `IMastraVoiceStt`, Kokoro → `IMastraVoiceTts`) in separate SDK directories. A standalone VAD domain module with full stack (business + app). A realtime-voice pipeline domain module that orchestrates VAD → STT → LLM → TTS via mediator commands. No explicit session lifecycle — state is lazily initialized per `conversationId`.

**Tech Stack:** TypeScript, Vitest, Zod, `avr-vad`, `smart-whisper`, `kokoro-js`, `@sanamyvn/foundation` (DI, mediator, HTTP)

**Spec:** `docs/superpowers/specs/2026-03-21-realtime-voice-pipeline-design.md`

---

## Chunk 1: SDK Layer — Silero VAD Adapter

### Task 1: Install `avr-vad` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `npm install avr-vad`

- [ ] **Step 2: Verify installation**

Run: `ls node_modules/avr-vad`
Expected: package directory exists

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install avr-vad for Silero VAD support"
```

### Task 2: Define `IVad` interface and DI tokens in VAD business domain

**Files:**
- Create: `src/business/domain/vad/vad.interface.ts`

- [ ] **Step 1: Write the interface file**

```typescript
import { createToken } from '@sanamyvn/foundation/di/core/tokens';

export interface VadConfig {
  readonly speechThreshold?: number;
  readonly silenceThreshold?: number;
  readonly minSpeechFrames?: number;
  readonly minSilenceDurationMs?: number;
}

export interface VadFrame {
  readonly isSpeech: boolean;
  readonly probability: number;
}

export interface IVad {
  processFrame(audio: Int16Array): Promise<VadFrame>;
  reset(): void;
}

export const VAD = createToken<IVad>('VAD');
export const VAD_CONFIG = createToken<VadConfig>('VAD_CONFIG');
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/vad/vad.interface.ts
git commit -m "feat(vad): add IVad interface and DI tokens"
```

### Task 3: Implement `SileroVadAdapter`

**Files:**
- Create: `src/business/sdk/silero/silero.adapter.ts`
- Create: `src/business/sdk/silero/silero.error.ts`
- Create: `src/business/sdk/silero/silero.providers.ts`

- [ ] **Step 1: Write the adapter error class**

Create `src/business/sdk/silero/silero.error.ts`:

```typescript
export class SileroAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Silero VAD ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

export function isSileroAdapterError(error: unknown): error is SileroAdapterError {
  return error instanceof SileroAdapterError;
}
```

- [ ] **Step 2: Write the adapter implementation**

Create `src/business/sdk/silero/silero.adapter.ts`. This wraps `avr-vad`'s `RealTimeVAD` class behind the `IVad` interface. The adapter manages the hysteresis logic (speech start/end thresholds, min speech frames, min silence duration) internally.

Check `avr-vad` documentation in `node_modules/avr-vad/README.md` for the exact API before writing. The adapter should:
- Import `RealTimeVAD` from `avr-vad`
- Inject `VAD_CONFIG` for threshold configuration
- Implement `processFrame(audio: Int16Array): Promise<VadFrame>` — delegates to `RealTimeVAD`, applies hysteresis thresholds from config, returns `{ isSpeech, probability }`
- Implement `reset(): void` — resets internal VAD state and hysteresis counters
- Wrap all `avr-vad` errors in `SileroAdapterError`

Use `@Injectable()` and `@Inject(VAD_CONFIG)` decorators following the existing adapter pattern in `src/business/sdk/mastra/adapters/mastra.voice-stt.ts`.

- [ ] **Step 3: Write providers**

Create `src/business/sdk/silero/silero.providers.ts`:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { VAD } from '@/business/domain/vad/vad.interface.js';
import { SileroVadAdapter } from './silero.adapter.js';

export function sileroProviders() {
  return {
    providers: [bind(VAD, SileroVadAdapter)],
    exports: [VAD],
  };
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/business/sdk/silero/
git commit -m "feat(silero): add SileroVadAdapter wrapping avr-vad"
```

### Task 4: Write tests for `SileroVadAdapter`

**Files:**
- Create: `src/business/sdk/silero/silero.adapter.spec.ts`

- [ ] **Step 1: Write failing tests**

Test cases to cover:
1. `processFrame` returns `{ isSpeech: false, probability }` for silence
2. `processFrame` returns `{ isSpeech: true, probability }` for speech above threshold
3. Hysteresis: speech starts only after `minSpeechFrames` consecutive frames above `speechThreshold`
4. Hysteresis: speech ends only after `minSilenceDurationMs` below `silenceThreshold`
5. `reset()` clears internal state
6. Wraps `avr-vad` errors as `SileroAdapterError`

Mock `avr-vad` using `vi.mock()`. Follow the pattern in `src/business/domain/rag/rag.business.spec.ts` — mock the external dependency, instantiate the adapter directly (not through DI), test each method.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/business/sdk/silero/silero.adapter.spec.ts`
Expected: FAIL (tests reference implementation details)

- [ ] **Step 3: Fix any test issues until tests pass**

Run: `npx vitest run src/business/sdk/silero/silero.adapter.spec.ts`
Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add src/business/sdk/silero/silero.adapter.spec.ts
git commit -m "test(silero): add SileroVadAdapter unit tests"
```

---

## Chunk 2: SDK Layer — Whisper STT Adapter

### Task 5: Install `smart-whisper` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `npm install smart-whisper`

Note: This is a native C++ addon (whisper.cpp). It may require build tools. If installation fails, check the `smart-whisper` README for prerequisites.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install smart-whisper for Whisper STT support"
```

### Task 6: Implement `WhisperSttAdapter`

**Files:**
- Create: `src/business/sdk/whisper/whisper.adapter.ts`
- Create: `src/business/sdk/whisper/whisper.error.ts`
- Create: `src/business/sdk/whisper/whisper.providers.ts`

- [ ] **Step 1: Write the adapter error class**

Create `src/business/sdk/whisper/whisper.error.ts`:

```typescript
export class WhisperAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Whisper STT ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

export function isWhisperAdapterError(error: unknown): error is WhisperAdapterError {
  return error instanceof WhisperAdapterError;
}
```

- [ ] **Step 2: Write the adapter implementation**

Create `src/business/sdk/whisper/whisper.adapter.ts`. This implements `IMastraVoiceStt` (the existing interface from `src/business/sdk/mastra/mastra.interface.ts`).

Check `smart-whisper` documentation in `node_modules/smart-whisper/README.md` for the exact API. The adapter should:
- Implement `speechToText(audioStream, options?)` — collects the stream into a buffer, passes to `smart-whisper` for transcription, returns the transcript string
- Implement `getListener()` — returns `{ enabled: true }` (always available)
- Wrap all `smart-whisper` errors in `WhisperAdapterError`
- Use `@Injectable()` decorator

- [ ] **Step 3: Write providers**

Create `src/business/sdk/whisper/whisper.providers.ts`:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_STT } from '@/business/sdk/mastra/mastra.interface.js';
import { WhisperSttAdapter } from './whisper.adapter.js';

export function whisperProviders() {
  return {
    providers: [bind(MASTRA_VOICE_STT, WhisperSttAdapter)],
    exports: [MASTRA_VOICE_STT],
  };
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/business/sdk/whisper/
git commit -m "feat(whisper): add WhisperSttAdapter implementing IMastraVoiceStt"
```

### Task 7: Write tests for `WhisperSttAdapter`

**Files:**
- Create: `src/business/sdk/whisper/whisper.adapter.spec.ts`

- [ ] **Step 1: Write tests**

Test cases:
1. `speechToText` collects audio stream and returns transcript string
2. `speechToText` wraps `smart-whisper` errors as `WhisperAdapterError`
3. `getListener` returns `{ enabled: true }`

Mock `smart-whisper` using `vi.mock()`.

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/business/sdk/whisper/whisper.adapter.spec.ts`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/sdk/whisper/whisper.adapter.spec.ts
git commit -m "test(whisper): add WhisperSttAdapter unit tests"
```

---

## Chunk 3: SDK Layer — Kokoro TTS Adapter

### Task 8: Install `kokoro-js` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `npm install kokoro-js`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install kokoro-js for Kokoro TTS support"
```

### Task 9: Implement `KokoroTtsAdapter`

**Files:**
- Create: `src/business/sdk/kokoro/kokoro.adapter.ts`
- Create: `src/business/sdk/kokoro/kokoro.error.ts`
- Create: `src/business/sdk/kokoro/kokoro.providers.ts`

- [ ] **Step 1: Write the adapter error class**

Create `src/business/sdk/kokoro/kokoro.error.ts`:

```typescript
export class KokoroAdapterError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Kokoro TTS ${operation} failed`, { cause });
    this.name = new.target.name;
  }
}

export function isKokoroAdapterError(error: unknown): error is KokoroAdapterError {
  return error instanceof KokoroAdapterError;
}
```

- [ ] **Step 2: Write the adapter implementation**

Create `src/business/sdk/kokoro/kokoro.adapter.ts`. This implements `IMastraVoiceTts` (existing interface).

Check `kokoro-js` documentation in `node_modules/kokoro-js/README.md` for the exact API. The adapter should:
- Implement `textToSpeech(input, options?)` — uses `kokoro-js` to synthesize speech, returns audio as a `ReadableStream`
- Implement `getSpeakers()` — returns the available Kokoro voices
- Wrap all `kokoro-js` errors in `KokoroAdapterError`
- Use `@Injectable()` decorator

- [ ] **Step 3: Write providers**

Create `src/business/sdk/kokoro/kokoro.providers.ts`:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_VOICE_TTS } from '@/business/sdk/mastra/mastra.interface.js';
import { KokoroTtsAdapter } from './kokoro.adapter.js';

export function kokoroProviders() {
  return {
    providers: [bind(MASTRA_VOICE_TTS, KokoroTtsAdapter)],
    exports: [MASTRA_VOICE_TTS],
  };
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/business/sdk/kokoro/
git commit -m "feat(kokoro): add KokoroTtsAdapter implementing IMastraVoiceTts"
```

### Task 10: Write tests for `KokoroTtsAdapter`

**Files:**
- Create: `src/business/sdk/kokoro/kokoro.adapter.spec.ts`

- [ ] **Step 1: Write tests**

Test cases:
1. `textToSpeech` returns a `ReadableStream` of audio data
2. `textToSpeech` wraps `kokoro-js` errors as `KokoroAdapterError`
3. `getSpeakers` returns available voices

Mock `kokoro-js` using `vi.mock()`.

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/business/sdk/kokoro/kokoro.adapter.spec.ts`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/sdk/kokoro/kokoro.adapter.spec.ts
git commit -m "test(kokoro): add KokoroTtsAdapter unit tests"
```

---

## Chunk 4: VAD Business Domain Module

### Task 11: Create VAD business layer

**Files:**
- Create: `src/business/domain/vad/vad.model.ts`
- Create: `src/business/domain/vad/vad.error.ts`
- Create: `src/business/domain/vad/vad.business.ts`
- Create: `src/business/domain/vad/vad.providers.ts`

- [ ] **Step 1: Write the model file**

Create `src/business/domain/vad/vad.model.ts`:

```typescript
import type { VadConfig } from './vad.interface.js';

export interface DetectSpeechInput {
  readonly audio: Int16Array;
}

export interface VadResult {
  readonly isSpeech: boolean;
  readonly probability: number;
}
```

- [ ] **Step 2: Write the error file**

Create `src/business/domain/vad/vad.error.ts`:

```typescript
export class VadError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export function isVadError(error: unknown): error is VadError {
  return error instanceof VadError;
}
```

- [ ] **Step 3: Write the business implementation**

Create `src/business/domain/vad/vad.business.ts`. Follow the pattern in `src/business/domain/voice/voice.business.ts`:
- `@Injectable()` class implementing `IVadBusiness`
- Inject `VAD` token (the `IVad` adapter)
- `detectSpeech(input)` — delegates to `IVad.processFrame()`, wraps errors as `VadError`
- `resetSession()` — delegates to `IVad.reset()`

Add `IVadBusiness` interface and `VAD_BUSINESS` token to `vad.interface.ts`:

```typescript
// Add to vad.interface.ts
export interface IVadBusiness {
  detectSpeech(input: DetectSpeechInput): Promise<VadResult>;
  resetSession(): void;
}

export const VAD_BUSINESS = createToken<IVadBusiness>('VAD_BUSINESS');
```

Import `DetectSpeechInput` and `VadResult` from `./vad.model.js`.

- [ ] **Step 4: Write providers**

Create `src/business/domain/vad/vad.providers.ts`:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { VAD_BUSINESS } from './vad.interface.js';
import { VadBusiness } from './vad.business.js';

export function vadBusinessProviders() {
  return {
    providers: [bind(VAD_BUSINESS, VadBusiness)],
    exports: [VAD_BUSINESS],
  };
}
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/business/domain/vad/
git commit -m "feat(vad): add VAD business layer with IVadBusiness"
```

### Task 12: Create VAD mediator client

**Files:**
- Create: `src/business/domain/vad/client/schemas.ts`
- Create: `src/business/domain/vad/client/queries.ts`
- Create: `src/business/domain/vad/client/errors.ts`
- Create: `src/business/domain/vad/client/mediator.ts`

- [ ] **Step 1: Write schemas**

Create `src/business/domain/vad/client/schemas.ts`. Follow the pattern in `src/business/domain/voice/client/schemas.ts`:

```typescript
import { z } from 'zod';

export const detectSpeechClientSchema = z.object({
  audio: z.string(), // base64-encoded Int16Array
});

export const detectSpeechResultSchema = z.object({
  isSpeech: z.boolean(),
  probability: z.number(),
});

export type DetectSpeechClientResult = z.infer<typeof detectSpeechResultSchema>;
```

- [ ] **Step 2: Write queries**

Create `src/business/domain/vad/client/queries.ts`:

```typescript
import { createCommand } from '@sanamyvn/foundation/mediator/request';
import { detectSpeechClientSchema, detectSpeechResultSchema } from './schemas.js';

export const VadDetectSpeechCommand = createCommand({
  type: 'ai.vad.detectSpeech',
  payload: detectSpeechClientSchema,
  response: detectSpeechResultSchema,
});
```

**Note:** The mediator schema uses base64 string for audio, but `IVad.processFrame()` takes `Int16Array`. The mediator handler (in `VadAppService`) must decode base64 → `Buffer` → `Int16Array` before calling the business layer.

- [ ] **Step 3: Write errors**

Create `src/business/domain/vad/client/errors.ts`:

```typescript
export class VadClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export function isVadClientError(error: unknown): error is VadClientError {
  return error instanceof VadClientError;
}
```

- [ ] **Step 4: Write mediator**

Create `src/business/domain/vad/client/mediator.ts`:

```typescript
import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { DetectSpeechClientResult } from './schemas.js';
import { VadDetectSpeechCommand } from './queries.js';

export interface IVadMediator {
  detectSpeech(
    command: InstanceType<typeof VadDetectSpeechCommand>,
  ): Promise<DetectSpeechClientResult>;
}

export const VAD_MEDIATOR = createMediatorToken<IVadMediator>('VAD_MEDIATOR', {
  detectSpeech: VadDetectSpeechCommand,
});
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/business/domain/vad/client/
git commit -m "feat(vad): add mediator client (schemas, queries, errors, mediator)"
```

### Task 13: Write VAD business layer tests

**Files:**
- Create: `src/business/domain/vad/vad.business.spec.ts`

- [ ] **Step 1: Write tests**

Follow the pattern in `src/business/domain/rag/rag.business.spec.ts`. Create a mock `IVad` implementation. Test:
1. `detectSpeech` delegates to `IVad.processFrame()` and returns result
2. `detectSpeech` wraps adapter errors as `VadError`
3. `resetSession` delegates to `IVad.reset()`

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/business/domain/vad/vad.business.spec.ts`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/vad/vad.business.spec.ts
git commit -m "test(vad): add VadBusiness unit tests"
```

---

## Chunk 5: VAD App Layer

### Task 14: Create VAD app layer

**Files:**
- Create: `src/app/domain/vad/vad.dto.ts`
- Create: `src/app/domain/vad/vad.mapper.ts`
- Create: `src/app/domain/vad/vad.error.ts`
- Create: `src/app/domain/vad/vad.tokens.ts`
- Create: `src/app/domain/vad/vad.service.ts`
- Create: `src/app/domain/vad/vad.router.ts`
- Create: `src/app/domain/vad/vad.providers.ts`
- Create: `src/app/domain/vad/vad.module.ts`

- [ ] **Step 1: Write all 8 app layer files**

Follow the exact patterns from the voice app layer (`src/app/domain/voice/`). Refer to:
- `voice.dto.ts` for DTO pattern
- `voice.mapper.ts` for mapper pattern
- `voice.error.ts` for HTTP error mapping pattern
- `voice.tokens.ts` for middleware config token pattern
- `voice.service.ts` for service pattern (uses `AI_MEDIATOR` to send commands)
- `voice.router.ts` for router pattern
- `voice.providers.ts` for provider bundle pattern
- `voice.module.ts` for module with `forMonolith()`/`forStandalone()` pattern

The VAD app layer exposes a single endpoint:
- `POST /ai/vad/detect-speech` — accepts base64 audio in JSON body, returns `{ isSpeech, probability }`

The service sends `VadDetectSpeechCommand` via the mediator.

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/domain/vad/
git commit -m "feat(vad): add app layer (router, service, module, DTOs)"
```

---

## Chunk 6: Realtime Voice Pipeline — Business Layer

### Task 15: Create realtime voice pipeline interfaces and models

**Files:**
- Create: `src/business/domain/realtime-voice/realtime-voice.interface.ts`
- Create: `src/business/domain/realtime-voice/realtime-voice.model.ts`
- Create: `src/business/domain/realtime-voice/realtime-voice.error.ts`

- [ ] **Step 1: Write the interface file**

Create `src/business/domain/realtime-voice/realtime-voice.interface.ts`:

```typescript
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { VadFrame } from '@/business/domain/vad/vad.interface.js';

export interface ProcessAudioInput {
  readonly conversationId: string;
  readonly audio: Int16Array;
}

export type PipelineState =
  | 'listening'
  | 'transcribing'
  | 'answering'
  | 'synthesizing'
  | 'speaking';

export type PipelineEvent =
  | { readonly type: 'transcript'; readonly text: string }
  | { readonly type: 'agentResponse'; readonly text: string }
  | { readonly type: 'audio'; readonly audio: string; readonly contentType: string }
  | { readonly type: 'stateChange'; readonly state: PipelineState }
  | { readonly type: 'error'; readonly message: string };

export interface ProcessAudioResult {
  readonly vad: VadFrame;
  readonly events: PipelineEvent[];
}

export interface IRealtimeVoiceBusiness {
  processAudio(input: ProcessAudioInput): Promise<ProcessAudioResult>;
}

export const REALTIME_VOICE_BUSINESS = createToken<IRealtimeVoiceBusiness>('REALTIME_VOICE_BUSINESS');
```

- [ ] **Step 2: Write the model file**

Create `src/business/domain/realtime-voice/realtime-voice.model.ts`:

```typescript
import type { PipelineState, PipelineEvent } from './realtime-voice.interface.js';

/** Internal per-conversation state managed by the pipeline. */
export interface ConversationPipelineState {
  conversationId: string;
  state: PipelineState;
  audioBuffer: Int16Array[];
  eventQueue: PipelineEvent[];
  lastFrameAt: number;
}
```

- [ ] **Step 3: Write the error file**

Create `src/business/domain/realtime-voice/realtime-voice.error.ts`:

```typescript
export class RealtimeVoiceError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export function isRealtimeVoiceError(error: unknown): error is RealtimeVoiceError {
  return error instanceof RealtimeVoiceError;
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/business/domain/realtime-voice/realtime-voice.interface.ts src/business/domain/realtime-voice/realtime-voice.model.ts src/business/domain/realtime-voice/realtime-voice.error.ts
git commit -m "feat(realtime-voice): add pipeline interfaces, models, and errors"
```

### Task 16: Implement `RealtimeVoiceBusiness`

**Files:**
- Create: `src/business/domain/realtime-voice/realtime-voice.business.ts`
- Create: `src/business/domain/realtime-voice/realtime-voice.providers.ts`

- [ ] **Step 1: Write the business implementation**

Create `src/business/domain/realtime-voice/realtime-voice.business.ts`. This is the pipeline orchestrator. Key behaviors:

- `@Injectable()` class implementing `IRealtimeVoiceBusiness`
- Inject `AI_MEDIATOR` to send mediator commands

**Architectural note:** This business-layer class uses the mediator, which is normally an app-layer concern. This is an intentional deviation — the pipeline is a **cross-domain orchestrator** that calls VAD, Voice, and Conversation modules. Injecting their SDK adapters directly would couple it to their internals. The mediator provides the decoupling the spec requires ("zero direct imports from SDK modules"). Check how `AI_MEDIATOR` is defined in `src/shared/tokens.ts` and ensure it's available in the business layer's DI scope.
- Internal `Map<string, ConversationPipelineState>` keyed by `conversationId`
- `processAudio(input)`:
  1. Lazy init: if no state for `conversationId`, create one with `state: 'listening'`
  2. Send `VadDetectSpeechCommand` via mediator → get `VadFrame`
  3. Drain `eventQueue` into response
  4. If `state === 'listening'`:
     - If `isSpeech`: push `audio` to `audioBuffer`
     - If `!isSpeech` and `audioBuffer` is non-empty (end of speech): kick off async chain via `this.runChain(conversationId)` (fire-and-forget, don't await)
  5. Update `lastFrameAt` timestamp
  6. Return `{ vad, events }`
- `runChain(conversationId)` — private async method:
  1. Set state to `'transcribing'`, flush batch 0: `[stateChange: 'transcribing']`
  2. Concatenate `audioBuffer` frames, convert to base64, set `contentType` to `'audio/pcm;rate=16000'` (16kHz mono Int16 PCM)
  3. Send `VoiceSpeechToTextCommand({ audio, contentType })` via mediator → get transcript
  4. Set state to `'answering'`, flush batch 1: `[transcript, stateChange: 'answering']`
  5. Send `SendMessageCommand(conversationId, transcript)` via mediator → get LLM response
  6. Set state to `'synthesizing'`
  7. Send `VoiceTextToSpeechCommand(response.text)` via mediator → get audio (base64)
  8. Set state to `'speaking'`, flush batch 2: `[agentResponse, audio, stateChange: 'listening']`
  9. Set state back to `'listening'`, clear `audioBuffer`
  10. Wrap entire chain in try/catch → on error, queue `{ type: 'error', message }` and reset to `'listening'`

Reference these existing mediator commands:
- `VadDetectSpeechCommand` from `@/business/domain/vad/client/queries.js`
- `VoiceSpeechToTextCommand` from `@/business/domain/voice/client/queries.js`
- `VoiceTextToSpeechCommand` from `@/business/domain/voice/client/queries.js`
- `SendMessageCommand` from `@/business/domain/conversation/client/queries.js`

Check the exact command names and payload schemas in those files before writing.

- [ ] **Step 2: Write providers**

Create `src/business/domain/realtime-voice/realtime-voice.providers.ts`:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { REALTIME_VOICE_BUSINESS } from './realtime-voice.interface.js';
import { RealtimeVoiceBusiness } from './realtime-voice.business.js';

export function realtimeVoiceBusinessProviders() {
  return {
    providers: [bind(REALTIME_VOICE_BUSINESS, RealtimeVoiceBusiness)],
    exports: [REALTIME_VOICE_BUSINESS],
  };
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/business/domain/realtime-voice/realtime-voice.business.ts src/business/domain/realtime-voice/realtime-voice.providers.ts
git commit -m "feat(realtime-voice): implement RealtimeVoiceBusiness pipeline orchestrator"
```

### Task 17: Write pipeline business layer tests

**Files:**
- Create: `src/business/domain/realtime-voice/realtime-voice.business.spec.ts`

- [ ] **Step 1: Write tests**

This is the most critical test file. Mock the mediator and test the state machine. Test cases:

1. **Lazy init**: first `processAudio` creates internal state, returns `{ vad, events: [] }`
2. **Speech buffering**: when VAD returns `isSpeech: true`, audio is buffered (verify via subsequent chain behavior)
3. **End of speech triggers chain**: VAD returns `isSpeech: false` after speech → chain runs async
4. **Batch 0 delivery**: after end-of-speech, next `processAudio` returns `stateChange: 'transcribing'`
5. **Batch 1 delivery**: after STT completes, `processAudio` returns `[transcript, stateChange: 'answering']`
6. **Batch 2 delivery**: after LLM + TTS, `processAudio` returns `[agentResponse, audio, stateChange: 'listening']`
7. **No duplicate chains**: audio during `transcribing`/`answering`/`synthesizing` state does not trigger new chain
8. **Multiple conversations**: two different `conversationId` values maintain separate state
9. **Error handling**: when STT fails, error event is queued and state resets to `listening`
10. **Audio format**: verify `Int16Array` → base64 conversion for STT command payload

Mock the mediator to control when each command resolves. Use `vi.fn()` with manual promise resolution to test the async batching behavior.

- [ ] **Step 2: Run and iterate until all pass**

Run: `npx vitest run src/business/domain/realtime-voice/realtime-voice.business.spec.ts`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/realtime-voice/realtime-voice.business.spec.ts
git commit -m "test(realtime-voice): add pipeline state machine and batch delivery tests"
```

---

## Chunk 7: Realtime Voice Pipeline — Mediator Client

### Task 18: Create realtime voice mediator client

**Files:**
- Create: `src/business/domain/realtime-voice/client/schemas.ts`
- Create: `src/business/domain/realtime-voice/client/queries.ts`
- Create: `src/business/domain/realtime-voice/client/errors.ts`
- Create: `src/business/domain/realtime-voice/client/mediator.ts`

- [ ] **Step 1: Write all 4 client files**

Follow the exact pattern from `src/business/domain/voice/client/`. The schemas define:
- `processAudioClientSchema` — `{ conversationId: string, audio: string }` (audio as base64)
- `processAudioResultSchema` — `{ vad: { isSpeech: boolean, probability: number }, events: array of PipelineEvent }`

The command:
- `ProcessAudioCommand` with type `'ai.realtimeVoice.processAudio'`

The mediator:
- `IRealtimeVoiceMediator` with `processAudio()` method
- `REALTIME_VOICE_MEDIATOR` token

The errors:
- `RealtimeVoiceClientError` base class + type guard

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/realtime-voice/client/
git commit -m "feat(realtime-voice): add mediator client (schemas, queries, errors, mediator)"
```

---

## Chunk 8: Realtime Voice Pipeline — App Layer

### Task 19: Create realtime voice app layer

**Files:**
- Create: `src/app/domain/realtime-voice/realtime-voice.dto.ts`
- Create: `src/app/domain/realtime-voice/realtime-voice.mapper.ts`
- Create: `src/app/domain/realtime-voice/realtime-voice.error.ts`
- Create: `src/app/domain/realtime-voice/realtime-voice.tokens.ts`
- Create: `src/app/domain/realtime-voice/realtime-voice.service.ts`
- Create: `src/app/domain/realtime-voice/realtime-voice.router.ts`
- Create: `src/app/domain/realtime-voice/realtime-voice.providers.ts`
- Create: `src/app/domain/realtime-voice/realtime-voice.module.ts`

- [ ] **Step 1: Write all 8 app layer files**

Follow the exact patterns from the voice app layer (`src/app/domain/voice/`).

The realtime voice app layer exposes a single endpoint:
- `POST /ai/realtime-voice/process-audio` — accepts `{ conversationId, audio }` (audio as base64), returns `{ vad, events }`

The service sends `ProcessAudioCommand` via the mediator.

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/domain/realtime-voice/
git commit -m "feat(realtime-voice): add app layer (router, service, module, DTOs)"
```

---

## Chunk 9: Package Exports & Integration

### Task 20: Add package.json exports for all new modules

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add exports**

Add the following exports to `package.json`, following the pattern of existing voice/rag exports. Add exports for:

**VAD SDK:**
- `./business/sdk/silero/providers` → `silero.providers.ts`

**Whisper SDK:**
- `./business/sdk/whisper/providers` → `whisper.providers.ts`

**Kokoro SDK:**
- `./business/sdk/kokoro/providers` → `kokoro.providers.ts`

**VAD Business:**
- `./business/vad` → `vad.interface.ts`
- `./business/vad/model` → `vad.model.ts`
- `./business/vad/error` → `vad.error.ts`
- `./business/vad/providers` → `vad.providers.ts`
- `./business/vad/client/schemas` → `client/schemas.ts`
- `./business/vad/client/queries` → `client/queries.ts`
- `./business/vad/client/errors` → `client/errors.ts`
- `./business/vad/client/mediator` → `client/mediator.ts`

**Realtime Voice Business:**
- `./business/realtime-voice` → `realtime-voice.interface.ts`
- `./business/realtime-voice/model` → `realtime-voice.model.ts`
- `./business/realtime-voice/error` → `realtime-voice.error.ts`
- `./business/realtime-voice/providers` → `realtime-voice.providers.ts`
- `./business/realtime-voice/client/schemas` → `client/schemas.ts`
- `./business/realtime-voice/client/queries` → `client/queries.ts`
- `./business/realtime-voice/client/errors` → `client/errors.ts`
- `./business/realtime-voice/client/mediator` → `client/mediator.ts`

**App layers:**
- `./app/vad/module` → `vad.module.ts`
- `./app/vad/providers` → `vad.providers.ts`
- `./app/realtime-voice/module` → `realtime-voice.module.ts`
- `./app/realtime-voice/providers` → `realtime-voice.providers.ts`

Each export needs `types` (`.d.ts`) and `default` (`.js`) pointing to `dist/`.

- [ ] **Step 2: Build and verify exports resolve**

Run: `npm run build`
Expected: build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add package.json exports for vad, realtime-voice, silero, whisper, kokoro"
```

### Task 21: Run full test suite

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all existing tests still pass, all new tests pass

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no lint errors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve lint and test issues"
```
