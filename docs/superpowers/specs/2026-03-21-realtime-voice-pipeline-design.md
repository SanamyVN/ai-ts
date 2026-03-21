# Realtime Voice Pipeline Design

Package: `@sanamyvn/ai-ts`

Add a generic realtime voice conversation pipeline to ai-ts, composed of open-source models running natively in Node.js. The pipeline orchestrates VAD (Voice Activity Detection), STT, LLM, and TTS through the mediator pattern, enabling real-time voice conversations between users and AI agents. The oral assessment use case (LLM asks questions, reprompts on silence) is one application — the pipeline itself is generic and reusable.

## Problem

The existing voice module wraps Mastra's cloud-based voice providers (OpenAI, ElevenLabs, etc.) behind stable interfaces. For realtime speech-to-speech conversations, it delegates entirely to monolithic providers like OpenAI Realtime or Gemini Live — these are black boxes where VAD, STT, LLM, and TTS are bundled together.

This creates three problems:

1. **Vendor lock-in** — no path to using open-source models for realtime voice
2. **No VAD visibility** — the pipeline can't observe or react to silence/speech signals (e.g., detecting when a user stops responding)
3. **No fine-grained control** — can't independently swap STT, TTS, or LLM components

## Relationship to Existing Architecture

| Concern | Owner |
| --- | --- |
| VAD detection (audio frame → speech probability) | `ai-ts` (new VAD module) |
| STT via open-source models (Whisper) | `ai-ts` (new `WhisperSttAdapter` → existing `IMastraVoiceStt`) |
| TTS via open-source models (Kokoro) | `ai-ts` (new `KokoroTtsAdapter` → existing `IMastraVoiceTts`) |
| LLM response generation | `ai-ts` (existing Mastra Agent via conversation engine) |
| Pipeline orchestration (VAD → STT → LLM → TTS) | `ai-ts` (new realtime-voice module) |
| Conversation creation & management | Downstream app (via existing `CreateConversationCommand`) |
| Client-facing WebSocket / audio transport | Downstream app |
| Silence timeout logic & reprompt decisions | Downstream app (interprets VAD events, sends messages to conversation) |
| Audio format conversion | Downstream app |

### How Realtime Voice Fits

The downstream app owns the WebSocket connection to the client and creates the conversation. From ai-ts's perspective, the pipeline receives audio frames via mediator commands and returns results — no realtime transport concern.

```
Client (browser/mobile)
  │
  │ WebSocket (downstream's module)
  ▼
┌─────────────────────────────────┐
│  Downstream App                 │  ← Owns WebSocket, creates conversation
└──────────┬──────────────────────┘
           │  Mediator commands
           ▼
┌─────────────────────────────────┐
│  ai-ts Realtime Voice Pipeline  │  ← Orchestrates VAD → STT → LLM → TTS
└──────────┬──────────────────────┘
           │  Mediator commands
           ▼
┌──────────┬──────────┬───────────┐
│ VAD      │ STT      │ TTS       │  ← Independent modules
│ (Silero) │ (Whisper) │ (Kokoro) │
└──────────┴──────────┴───────────┘
```

## Architecture

### Module Structure

Four independent concerns, all communicating via mediator:

```
src/business/
├── sdk/
│   ├── silero/                 # SileroVadAdapter → IVad
│   │   ├── silero.adapter.ts
│   │   ├── silero.error.ts
│   │   └── silero.providers.ts
│   │
│   ├── whisper/                # WhisperSttAdapter → IMastraVoiceStt
│   │   ├── whisper.adapter.ts
│   │   ├── whisper.error.ts
│   │   └── whisper.providers.ts
│   │
│   └── kokoro/                 # KokoroTtsAdapter → IMastraVoiceTts
│       ├── kokoro.adapter.ts
│       ├── kokoro.error.ts
│       └── kokoro.providers.ts
│
└── domain/
    ├── vad/                    # VAD module (standalone, full stack)
    │   ├── vad.interface.ts    # IVadBusiness
    │   ├── vad.business.ts
    │   ├── vad.model.ts
    │   ├── vad.error.ts
    │   ├── vad.providers.ts
    │   └── client/
    │       ├── queries.ts      # VadDetectSpeechCommand
    │       ├── schemas.ts
    │       ├── errors.ts
    │       └── mediator.ts     # IVadMediator
    │
    └── realtime-voice/         # Pipeline orchestrator
        ├── realtime-voice.interface.ts  # IRealtimeVoiceBusiness
        ├── realtime-voice.business.ts
        ├── realtime-voice.model.ts
        ├── realtime-voice.error.ts
        ├── realtime-voice.providers.ts
        └── client/
            ├── queries.ts      # ProcessAudioCommand
            ├── schemas.ts
            ├── errors.ts
            └── mediator.ts     # IRealtimeVoiceMediator

src/app/
└── domain/
    ├── vad/                    # VAD app layer (REST endpoints)
    │   ├── vad.module.ts
    │   ├── vad.service.ts
    │   ├── vad.router.ts
    │   ├── vad.dto.ts
    │   ├── vad.mapper.ts
    │   ├── vad.error.ts
    │   ├── vad.tokens.ts
    │   └── vad.providers.ts
    │
    └── realtime-voice/         # Pipeline app layer
        ├── realtime-voice.module.ts
        ├── realtime-voice.service.ts
        ├── realtime-voice.router.ts
        ├── realtime-voice.dto.ts
        ├── realtime-voice.mapper.ts
        ├── realtime-voice.error.ts
        ├── realtime-voice.tokens.ts
        └── realtime-voice.providers.ts
```

### Adapter Coexistence with Existing Mastra Voice Adapters

Whisper and Kokoro adapters live in `src/business/sdk/whisper/` and `src/business/sdk/kokoro/` — separate from the existing Mastra adapters in `src/business/sdk/mastra/adapters/`. They are not Mastra providers; they are independent open-source tools that happen to implement the same `IMastraVoiceStt` and `IMastraVoiceTts` interfaces.

**DI wiring:** Downstream apps choose which adapters to bind at composition time. Only one STT adapter and one TTS adapter can be bound to `MASTRA_VOICE_STT` / `MASTRA_VOICE_TTS` per module. For example:

- Use `mastraVoiceProviders()` to bind OpenAI/ElevenLabs adapters (existing, cloud)
- Use `whisperProviders()` to bind Whisper adapter (new, local)
- Use `kokoroProviders()` to bind Kokoro adapter (new, local)

These are mutually exclusive bindings to the same tokens. The pipeline module's providers bind Whisper and Kokoro by default; downstream apps can override by providing their own bindings.

### SDK Layer — IVad Interface & Silero Adapter

The `IVad` interface is defined in the VAD business domain (`src/business/domain/vad/vad.interface.ts`), not in the Silero adapter directory. This keeps the interface provider-agnostic — a new adapter (e.g., WebRTC VAD) can implement it without depending on Silero code.

The Silero adapter (`src/business/sdk/silero/`) implements `IVad`.

```typescript
// src/business/domain/vad/vad.interface.ts (IVad defined here, not in silero/)

export interface VadConfig {
  readonly speechThreshold?: number;       // default 0.5
  readonly silenceThreshold?: number;      // default 0.35 (speechThreshold - 0.15)
  readonly minSpeechFrames?: number;       // default 3
  readonly minSilenceDurationMs?: number;  // default 550ms
}

export interface VadFrame {
  readonly isSpeech: boolean;
  readonly probability: number;  // 0.0 - 1.0
}

export interface IVad {
  processFrame(audio: Int16Array): Promise<VadFrame>;
  reset(): void;
}
```

**Threshold logic:** The adapter uses a hysteresis pattern. Speech starts when probability exceeds `speechThreshold` (0.5) for `minSpeechFrames` consecutive frames. Speech ends when probability drops below `silenceThreshold` (0.35) for `minSilenceDurationMs`. This prevents rapid toggling at the boundary.

**SileroVadAdapter** wraps the `avr-vad` npm package (`RealTimeVAD` class), which runs Silero VAD v5 via `onnxruntime-node`. The ONNX model (~2MB) is bundled with the package. Each frame is ~32ms of 16kHz audio (512 samples), processed in <1ms on CPU.

### SDK Layer — Whisper STT Adapter

```typescript
// src/business/sdk/whisper/whisper.adapter.ts
// Implements IMastraVoiceStt (existing interface)

export class WhisperSttAdapter implements IMastraVoiceStt {
  speechToText(
    audioStream: NodeJS.ReadableStream,
    options?: Record<string, unknown>,
  ): Promise<string | NodeJS.ReadableStream | void>;

  getListener(): Promise<{ enabled: boolean }>;
}
```

Wraps the `smart-whisper` npm package (whisper.cpp native Node.js addon). Batch operation — receives the full audio buffer collected after VAD detects end-of-speech, returns a transcript string.

Configuration: model size (tiny/base/small/medium/large), language code. Defaults to `base` model for balance of speed and accuracy.

### SDK Layer — Kokoro TTS Adapter

```typescript
// src/business/sdk/kokoro/kokoro.adapter.ts
// Implements IMastraVoiceTts (existing interface)

export class KokoroTtsAdapter implements IMastraVoiceTts {
  textToSpeech(
    input: string | NodeJS.ReadableStream,
    options?: SpeakOptions,
  ): Promise<NodeJS.ReadableStream | void>;

  getSpeakers(): Promise<{ voiceId: string; [key: string]: unknown }[]>;
}
```

Wraps the `kokoro-js` npm package (ONNX in Node.js). Supports streaming via `TextSplitterStream`. Returns audio as a `ReadableStream`. English only (Kokoro limitation — 82M parameter model).

### VAD Business Layer

```typescript
// src/business/domain/vad/vad.interface.ts

export interface DetectSpeechInput {
  readonly audio: Int16Array;
  readonly config?: VadConfig;
}

export interface VadResult {
  readonly isSpeech: boolean;
  readonly probability: number;
}

export interface IVadBusiness {
  detectSpeech(input: DetectSpeechInput): Promise<VadResult>;
  resetSession(): void;
}
```

Thin wrapper over the `IVad` SDK adapter. Normalizes results, applies error handling, and is exposed via mediator as `VadDetectSpeechCommand`.

**VAD REST endpoint** (app layer): `POST /ai/vad/detect-speech` — accepts audio frame (binary), returns `{ isSpeech, probability }`. This endpoint is for testing/debugging and batch analysis, not for per-frame realtime use (HTTP overhead at 31 requests/second would be prohibitive). For realtime VAD, downstream apps inject `IVadBusiness` directly.

### Realtime Voice Pipeline — Business Layer

```typescript
// src/business/domain/realtime-voice/realtime-voice.interface.ts

export interface ProcessAudioInput {
  readonly conversationId: string;      // created by downstream, passed in
  readonly audio: Int16Array;
}

export type PipelineState =
  | 'listening'       // VAD is active, waiting for speech
  | 'transcribing'    // STT is processing the audio buffer
  | 'answering'       // LLM is generating a response
  | 'synthesizing'    // TTS is converting response to audio
  | 'speaking';       // audio delivered, waiting before next listen

export type PipelineEvent =
  | { readonly type: 'transcript'; readonly text: string }
  | { readonly type: 'agentResponse'; readonly text: string }
  | { readonly type: 'audio'; readonly audio: string; readonly contentType: string }  // base64-encoded
  | { readonly type: 'stateChange'; readonly state: PipelineState }
  | { readonly type: 'error'; readonly message: string };

export interface ProcessAudioResult {
  readonly vad: VadFrame;
  readonly events: PipelineEvent[];    // accumulated events since last call
}

export interface IRealtimeVoiceBusiness {
  processAudio(input: ProcessAudioInput): Promise<ProcessAudioResult>;
}
```

**No explicit session lifecycle:** The pipeline has no `startSession` or `endSession`. Internal state (VAD model state, audio buffer, event queue) is lazily initialized on the first `processAudio` call for a given `conversationId` and cleaned up when the conversation ends or no frames arrive for a configurable idle timeout. This keeps the API surface minimal — just one method.

**VadConfig is infrastructure, not per-request:** `VadConfig` is provided at module initialization time via `factory()` in the downstream app's DI module (same pattern as `MASTRA_CORE_AGENT` in aiya's `MastraModule`). The `RealtimeVoiceBusiness` injects `VAD_CONFIG` from DI — it is never passed per-request.

**How async results are delivered without callbacks:** When VAD detects end-of-speech, the STT→LLM→TTS chain runs asynchronously inside the pipeline. The downstream app is already calling `processAudio` every ~32ms (one per audio frame from the client). Each `processAudio` call returns the VAD result plus any events queued since the last call. Most calls return `{ vad, events: [] }`.

**Three-batch event delivery:** The chain flushes events in three batches at natural boundaries:
- **Batch 0** (immediately on end-of-speech): `[stateChange: 'transcribing']` — downstream shows "Transcribing..." while STT runs
- **Batch 1** (after STT completes): `[transcript, stateChange: 'answering']` — the user sees their own words + "Answering..." while LLM runs
- **Batch 2** (after LLM + TTS complete): `[agentResponse, audio, stateChange: 'listening']` — the LLM's response text and audio arrive together so the UI can display and play them simultaneously

This keeps everything as pure request/response through the mediator — no callbacks, no WebSockets, no direct injection. Audio frames received during non-listening states still get VAD processed (returned to the caller) but do not trigger a new chain.

**Audio as base64 string:** `PipelineEvent.audio` uses base64-encoded string (consistent with existing voice mediator schemas) so it is fully serializable over the mediator.

### Pipeline State Machine

```
LISTENING (initial state, lazily created on first processAudio)
     │
processAudio() per frame
     │
┌────┴────┐
│         │
speech    silence continues
detected  (return vad only)
(buffer)
│
end of speech
(silence after speech)
│
▼
TRANSCRIBING ──→ batch 0: [stateChange: 'transcribing']
│
STT completes
│
▼
ANSWERING ────→ batch 1: [transcript, stateChange: 'answering']
│
LLM responds
│
▼
SYNTHESIZING
│
TTS completes
│
▼
SPEAKING ─────→ batch 2: [agentResponse, audio, stateChange: 'listening']
│
▼
LISTENING ◄──┘
```

### Pipeline Flow — Mediator Commands

The pipeline orchestrates via mediator commands only — zero direct imports from SDK modules. It reuses existing mediator commands from the voice and conversation modules:

- `VadDetectSpeechCommand` — new, defined in `src/business/domain/vad/client/queries.ts`
- `VoiceSpeechToTextCommand` — existing, from `src/business/domain/voice/client/queries.ts`
- `VoiceTextToSpeechCommand` — existing, from `src/business/domain/voice/client/queries.ts`
- `SendMessageCommand` — existing, from `src/business/domain/conversation/client/queries.ts`

**Flow:**

1. **`processAudio({ conversationId, audio })`** — always returns immediately:
   - On first call for a `conversationId`: lazily initializes internal state (VAD, audio buffer, event queue)
   - Sends `VadDetectSpeechCommand(audio)` → gets `VadFrame`
   - Drains any queued events into the response: `{ vad, events: [...] }`
   - If speech detected: buffers audio frames internally
   - If end-of-speech (silence after speech): kicks off async chain (does not block return):
     1. **Flush batch 0:** `[stateChange: 'transcribing']` — user sees "Transcribing..."
     2. Converts buffered audio to base64 → sends `VoiceSpeechToTextCommand` → gets transcript
     3. **Flush batch 1:** `[transcript, stateChange: 'answering']` — user sees their words + "Answering..."
     4. Sends `SendMessageCommand(conversationId, transcript)` → gets LLM response
     5. Sends `VoiceTextToSpeechCommand(response)` → gets audio (base64)
     6. **Flush batch 2:** `[agentResponse, audio, stateChange: 'listening']` — LLM text + audio arrive together
   - Each batch is picked up by subsequent `processAudio` calls
   - Internal state is cleaned up after a configurable idle timeout (no frames received)

**Audio format note:** The pipeline converts between `Int16Array` (raw frames from client) and base64 strings (existing voice mediator schema) internally. Downstream does not need to handle this conversion.

### Downstream App Usage Pattern

The following example shows how a downstream app integrates the realtime voice pipeline using `@sanamyvn/foundation`'s WebSocket module. The pattern follows the same structure as existing WS endpoints (e.g., chat streaming) — a WS route with inbound/outbound pipelines, connection state tracked in a `Map`, and mediator calls inside the handler.

**Router (downstream app):**

**Module initialization (downstream app):**

`VadConfig` is infrastructure configuration, provided at module initialization time via `factory()` — same pattern as `MASTRA_CORE_AGENT` in aiya's `MastraModule`:

```typescript
import { Module } from '@sanamyvn/foundation/di/node/module';
import { factory } from '@sanamyvn/foundation/di/core/providers';
import { VAD_CONFIG } from '@sanamyvn/ai-ts/business/vad';
import { realtimeVoiceProviders } from '@sanamyvn/ai-ts/business/realtime-voice/providers';
import { APP_CONFIG, type AppConfig } from '@backend/config';

const realtimeVoice = realtimeVoiceProviders();

export class RealtimeVoiceModule extends Module {
  providers = [
    factory(VAD_CONFIG, [APP_CONFIG], (config: AppConfig) => ({
      speechThreshold: config.vad.speechThreshold,
      silenceThreshold: config.vad.silenceThreshold,
      minSpeechFrames: config.vad.minSpeechFrames,
      minSilenceDurationMs: config.vad.minSilenceDurationMs,
    })),
    ...realtimeVoice.providers,
  ];
  exports = [...realtimeVoice.exports];
}
```

**Router (downstream app):**

```typescript
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import type { IWebSocket } from '@sanamyvn/foundation/http/ws';
import { binaryOnly, jsonSerialize } from '@sanamyvn/foundation/http/ws-pipes';
import { getLogger } from '@sanamyvn/foundation/logging/global';
import type { IConversationMediator } from '@sanamyvn/ai-ts/conversation/client';
import type { IRealtimeVoiceMediator } from '@sanamyvn/ai-ts/realtime-voice/client';
import type { IVoiceMediator } from '@sanamyvn/ai-ts/voice/client';

interface WSConnectionState {
  conversationId: string;
  silenceTimer?: NodeJS.Timeout;
}

@Injectable()
export class VoiceAssessmentRouter implements IRouter {
  readonly basePath = '/assessments';
  private readonly logger = getLogger(VoiceAssessmentRouter.name);
  private readonly wsState = new Map<IWebSocket, WSConnectionState>();

  constructor(
    @Inject(CONVERSATION_MEDIATOR) private readonly conversationMediator: IConversationMediator,
    @Inject(REALTIME_VOICE_MEDIATOR) private readonly realtimeVoiceMediator: IRealtimeVoiceMediator,
    @Inject(VOICE_MEDIATOR) private readonly voiceMediator: IVoiceMediator,
    @Inject(VOICE_ASSESSMENT_CONFIG) private readonly config: VoiceAssessmentConfig,
  ) {}

  register(app: IRouterBuilder): void {
    // WS /assessments/:id/voice/stream
    app
      .ws('/:id/voice/stream')
      .pipeline((cfg) =>
        cfg
          .inbound((b) => b.pipe(binaryOnly))       // client sends raw audio binary
          .outbound((b) => b.pipe(jsonSerialize)),   // server sends JSON events
      )
      .onOpen(async (ctx) => {
        const assessmentId = ctx.request.param('id') ?? '';

        // 1. Create conversation via ai-ts mediator
        const conversation = await this.conversationMediator.create({
          promptSlug: 'oral-assessment',
          promptParams: { assessmentId },
          userId: 'user-placeholder',
          purpose: 'oral-assessment',
        });

        this.wsState.set(ctx.connection, {
          conversationId: conversation.id,
        });

        // 2. Get LLM's opening question and send TTS audio to client
        const opening = await this.conversationMediator.send(
          conversation.id,
          'Begin the assessment.',
        );
        const openingAudio = await this.voiceMediator.textToSpeech(opening.text);
        ctx.send({ event: 'audio', data: openingAudio });
        ctx.send({ event: 'stateChange', data: { state: 'listening' } });

        this.logger.debug('Voice assessment started', { assessmentId, conversationId: conversation.id });
      })
      .onClose((_code, _reason, ctx) => {
        const state = this.wsState.get(ctx.connection);
        if (state) {
          if (state.silenceTimer) clearTimeout(state.silenceTimer);
          this.logger.debug('Voice assessment ended', { conversationId: state.conversationId });
        }
        this.wsState.delete(ctx.connection);
      })
      .onError((error, ctx) => {
        this.logger.error('WS error', { error: error.message });
        ctx.send({ event: 'error', data: { message: error.message } });
      })
      .handle(async (audioFrame, ctx) => {
        const state = this.wsState.get(ctx.connection);
        if (!state) return;

        // 3. Forward audio frame to pipeline, get VAD + any queued events
        const result = await this.realtimeVoiceMediator.processAudio({
          conversationId: state.conversationId,
          audio: new Int16Array(audioFrame),
        });

        // 4. Handle silence detection (use-case-specific)
        if (!result.vad.isSpeech) {
          if (!state.silenceTimer) {
            state.silenceTimer = setTimeout(async () => {
              await this.conversationMediator.send(
                state.conversationId,
                '[User has been silent]',
              );
              state.silenceTimer = undefined;
            }, this.config.silenceTimeoutMs);
          }
        } else if (state.silenceTimer) {
          clearTimeout(state.silenceTimer);
          state.silenceTimer = undefined;
        }

        // 5. Forward pipeline events to client
        for (const event of result.events) {
          ctx.send({ event: event.type, data: event });
        }
      });
  }
}
```

**Key points:**
- `VadConfig` is injected via `factory()` at module init — never passed per-request
- No `startSession` / `endSession` — pipeline lazily initializes state on first `processAudio` per `conversationId`
- Client sends raw audio binary via WebSocket (inbound pipe: `binaryOnly`)
- Server sends JSON events back (outbound pipe: `jsonSerialize`)
- Connection state (`conversationId`, `silenceTimer`) tracked in `Map<IWebSocket, WSConnectionState>`
- `onOpen` creates conversation + sends opening audio via existing voice/conversation mediators
- `onClose` cleans up timers (pipeline state is cleaned up via idle timeout)
- `handle` forwards each audio frame to the pipeline via mediator, then relays events to client
- Silence reprompt logic is downstream-specific — the 10-second timer and the `[User has been silent]` message are the downstream app's decision, not the pipeline's

## Dependencies

All Node.js native — no Python sidecar required:

| Package | Purpose | Size | Runtime |
| --- | --- | --- | --- |
| `avr-vad` | Silero VAD v5 via ONNX | ~2MB model | CPU (onnxruntime-node) |
| `smart-whisper` | Whisper.cpp native addon | ~75MB (base model) | CPU (C++ addon) |
| `kokoro-js` | Kokoro TTS via ONNX | ~82M params | CPU (onnxruntime-node) |
| `ollama` / `ai-sdk-ollama` | LLM inference | N/A (external server) | Ollama server |

**Ollama** is the recommended LLM backend. It runs separately and is accessed through the existing Mastra Agent integration via `ai-sdk-ollama`. Recommended models: Llama 3.2 8B or Qwen 2.5 7B (~8GB RAM).

## Limitations & Trade-offs

| Limitation | Reason | Mitigation |
| --- | --- | --- |
| Kokoro TTS is English only | 82M param model, multilingual not yet supported | Swap adapter for Chatterbox-ML or cloud provider when multilingual needed |
| Whisper STT is batch, not streaming | Whisper architecture processes fixed-length segments | VAD handles turn detection; STT runs on complete utterances after silence |
| No GPU acceleration | All models run on CPU via ONNX/whisper.cpp | Sufficient for single-session use; scale horizontally for concurrency |
| Ollama runs as separate server | Not embeddable in Node.js process | Standard deployment pattern; `ollama` npm package handles communication |
| Pipeline internal state is in-memory | No persistence across restarts | Acceptable for realtime processing; conversation history persists via conversation engine. State is lazily recreated on next `processAudio` call |

## Error Handling

Each SDK adapter wraps errors in adapter-specific error types:

- `SileroAdapterError` — VAD inference failures
- `WhisperAdapterError` — STT transcription failures
- `KokoroAdapterError` — TTS synthesis failures

Business layers wrap these into domain errors:

- `VadError` — VAD business layer errors
- `RealtimeVoiceError` — Pipeline errors (session not found, invalid state, etc.)

App layers map to HTTP status codes following the existing pattern.

## Audio Format

| Boundary | Format | Details |
| --- | --- | --- |
| Client → Pipeline (`processAudio`) | `Int16Array` | 16kHz mono, 512 samples per frame (~32ms) |
| Pipeline → VAD (`VadDetectSpeechCommand`) | `Int16Array` | Same as input — no conversion needed |
| Pipeline → STT (`VoiceSpeechToTextCommand`) | base64 string | Pipeline concatenates buffered frames, converts to base64 per existing voice mediator schema |
| Pipeline → TTS (`VoiceTextToSpeechCommand`) | string (text) | Plain text input |
| Pipeline → Client (`ProcessAudioResult.events`) | base64 string | Audio event uses base64 + contentType, consistent with existing voice mediator schemas |

The pipeline handles all internal format conversions. Downstream apps send `Int16Array` frames in and receive base64-encoded audio out via events.

## Decisions

| Decision | Rationale |
| --- | --- |
| Separate SDK directories for Silero/Whisper/Kokoro (not under `mastra/`) | These are not Mastra providers — they are independent open-source tools. Grouping them under `mastra/` would misrepresent ownership |
| VAD as its own full domain module | VAD is independently useful outside the pipeline (e.g., standalone speech detection endpoint). Keeping it as a separate module enables reuse |
| `processAudio` returns immediately, events piggybacked on responses | The STT→LLM→TTS chain takes 2-5+ seconds. Blocking the per-frame call would stall the downstream audio loop. Events queue internally and drain via subsequent `processAudio` calls — pure request/response, fully mediator-compatible |
| Three-batch event delivery | Batch 0 (transcribing state) flushes on end-of-speech for immediate UI feedback. Batch 1 (transcript + answering state) flushes after STT — user sees what they said. Batch 2 (agentResponse + audio) flushes after LLM + TTS — ensures LLM text and audio arrive together for simultaneous display/playback |
| Granular pipeline states (6 states) | `transcribing`, `answering`, `synthesizing` give downstream precise visibility into what the pipeline is doing, enabling richer UI feedback (loading indicators, status text) |
| Pipeline reuses existing voice mediator commands | Avoids duplicating STT/TTS mediator infrastructure. The pipeline converts between `Int16Array` and base64 internally to match existing schemas |
| `IVad` defined in business domain, not in Silero SDK | Keeps the interface provider-agnostic. New VAD adapters (WebRTC, pyannote) implement the same interface without depending on Silero code |
| Audio frames during non-listening states still get VAD but don't trigger new chain | The user's speech has already been captured; prevents duplicate chains |
| No explicit session lifecycle (startSession/endSession) | Pipeline lazily initializes on first `processAudio` per `conversationId`. Downstream already manages conversation lifecycle. Pipeline state is cleaned up via idle timeout |
| VadConfig at module init, not per-request | VAD thresholds are infrastructure config (like model selection), not request data. Uses `factory()` DI pattern, same as `MASTRA_CORE_AGENT` |
| Pipeline exposed via mediator (request/response) | Events piggybacked on `processAudio` responses instead of callbacks. Downstream's continuous audio frame stream is the natural polling mechanism — no need for callbacks, WebSockets, or direct injection |
| VAD REST endpoint is for testing/batch only | HTTP overhead at 31 req/s (one per 32ms frame) is prohibitive. Realtime VAD use injects `IVadBusiness` directly |

## Testing Strategy

- **Unit tests**: Each adapter tested with mock audio data
- **Integration tests**: Pipeline end-to-end with real adapters (requires model files)
- **Business layer tests**: Pipeline state machine transitions with mocked mediator commands
- **State machine tests**: All transition paths including edge cases (audio during PROCESSING, endSession during SPEAKING, etc.)
- **Error propagation tests**: Verify adapter errors surface correctly through business layer to pipeline events
