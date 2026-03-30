# Gender-Based TTS Selection Design

Package: `@sanamyvn/ai-ts`

Add a config-driven gender-based text-to-speech selection flow so downstream apps store and pass business intent (`male` or `female`) while `ai-ts` resolves the concrete provider voice internally. The concrete voice ID must come from downstream app config, not from callers.

## Problem

The current voice contract in `ai-ts` allows callers to pass a raw `speaker` string for TTS. That leaks provider-specific voice IDs such as `alloy`, `nova`, or `af_heart` into downstream business code and persistence models.

For `digi-talk`, the desired behavior is different:

- the UI should let users choose only a speaker gender
- the `teaching_assistants` table should persist only that gender
- downstream business code should pass only that gender into `ai-ts`
- `ai-ts` should resolve the real TTS voice using config

This keeps provider detail in configuration, not in product business logic or the database.

## Goals

- Replace caller-facing raw TTS `speaker` selection with required `speakerGender`
- Keep provider-specific voice IDs in config only
- Preserve the current layered architecture in `ai-ts`
- Keep TTS adapters transport-focused
- Allow downstream apps to change male/female voice mapping by config only

## Non-Goals

- Changing STT behavior
- Adding locale-aware or provider-aware fallback logic
- Supporting optional or implicit `speakerGender`
- Solving realtime voice voice-selection in this change

## Relationship to Existing Architecture

| Concern | Owner |
| --- | --- |
| `speakerGender` business meaning | Downstream app |
| Persisting `speakerGender` | Downstream app |
| Mapping `speakerGender` to provider voice ID | `@sanamyvn/ai-ts` voice business |
| Provider voice ID configuration | Downstream app config |
| TTS transport request to `/v1/audio/speech` | `@sanamyvn/ai-ts` TTS adapter |

This follows the same broad pattern used by Mastra integration:

- downstream apps bind validated config into the DI graph
- `ai-ts` business consumes a purpose-built token instead of reaching into app config directly

## Final Design

### Config Shape

Downstream app config exposes voice mapping under `ai.voices.tts`:

```yaml
ai:
  voices:
    tts:
      male: alloy
      female: nova
```

This config remains extensible. Future voice-related config can live under `ai.voices` without adding more top-level AI config keys.

### Business Contract

The `ai-ts` voice business contract changes from:

```ts
textToSpeech({ text, speaker?: string, options? })
```

to:

```ts
textToSpeech({ text, speakerGender: 'male' | 'female', options? })
```

Raw provider voice IDs are no longer part of the caller-facing TTS contract.

### DI Boundary

Introduce a new DI token in `voice.interface.ts`:

- `VOICE_TTS_CONFIG`

with a minimal injected shape:

```ts
interface VoiceTtsConfig {
  male: string;
  female: string;
}
```

Downstream apps bind `VOICE_TTS_CONFIG` from `AI_CONFIG.voices.tts`.

`VoiceBusiness` injects `VOICE_TTS_CONFIG`, resolves `speakerGender` to a concrete voice ID, and passes the resolved `speaker` to the TTS adapter.

This keeps:

- config ownership in the integration layer
- policy in the business layer
- transport concerns in the adapter

### Resolution Flow

```text
downstream UI / business
  -> speakerGender: "male" | "female"
  -> ai-ts VoiceBusiness
  -> VOICE_TTS_CONFIG lookup
  -> resolved provider voice ID
  -> OpenAiTtsAdapter.textToSpeech(..., { speaker: resolvedVoice })
```

## File-Level Changes

### ai-ts

#### `src/config.ts`

Add config schema for:

- `voices`
- `voices.tts`
- `voices.tts.male`
- `voices.tts.female`

This updates `AiConfig` so downstream apps can validate the new voice mapping.

#### `src/business/domain/voice/voice.interface.ts`

Add:

- `SpeakerGender` type: `'male' | 'female'`
- `VoiceTtsConfig` interface: `{ male: string; female: string }`
- `VOICE_TTS_CONFIG` token

This file is the correct location because the token belongs to the voice business contract.

#### `src/business/domain/voice/voice.model.ts`

Change `TextToSpeechInput`:

- remove `speaker?: string`
- add required `speakerGender: SpeakerGender`

#### `src/business/domain/voice/voice.business.ts`

Inject `VOICE_TTS_CONFIG` alongside `MASTRA_VOICE_TTS` and `MASTRA_VOICE_STT`.

Behavior change:

- resolve `speakerGender` to a configured concrete voice
- call the TTS adapter with resolved `speaker`
- keep `options` passthrough behavior unchanged

This file becomes the single place where business intent turns into provider-specific TTS input.

#### `src/business/domain/voice/voice.business.spec.ts`

Update and expand tests:

- male resolves to configured male voice
- female resolves to configured female voice
- provider-specific options still pass through
- existing error wrapping behavior remains unchanged

#### `src/business/domain/voice/client/schemas.ts`

Replace request field:

- `speaker?: string`

with:

- `speakerGender: z.enum(['male', 'female'])`

#### `src/app/sdk/voice-client/voice-local.mediator.ts`

Pass `speakerGender` into `voiceBusiness.textToSpeech()`.

#### `src/app/sdk/voice-client/voice-remote.mediator.ts`

Send `speakerGender` in the HTTP body instead of `speaker`.

#### `src/business/sdk/openai-tts/openai-tts.adapter.ts`

No gender-resolution logic is added here.

The adapter remains transport-only:

- reads provider URL, key, headers, and model from config
- accepts an already-resolved `speaker`
- sends the HTTP request

This avoids mixing business policy into transport code.

### digi-talk

#### `packages/backend/src/foundation/ai.module.ts`

Bind `VOICE_TTS_CONFIG` from validated app config:

- input: `AI_CONFIG.voices.tts`
- output: `{ male, female }`

This is the integration boundary for the new token.

#### `packages/backend/src/repository/domain/teaching-assistant/teaching-assistant.schema.ts`

Add `speakerGender` column to `teaching_assistants`.

#### `packages/backend/drizzle/*`

Add migration and snapshot updates for the new column.

#### `packages/backend/src/business/domain/teaching-assistant/teaching-assistant.model.ts`

Add `speakerGender` to:

- model schema
- create input schema
- update input schema

#### `packages/backend/src/business/domain/teaching-assistant/teaching-assistant.business.ts`

Set default on create:

```ts
speakerGender: input.speakerGender ?? 'male'
```

This matches the agreed product behavior.

#### `packages/backend/src/business/domain/teaching-assistant/teaching-assistant.mapper.ts`

Map persisted `speakerGender` into the business model.

#### `packages/api-contract/src/domain/teaching-assistant/teaching-assistant.dto.ts`

Expose `speakerGender` in create, update, and response DTOs.

#### `packages/backend/src/app/domain/teaching-assistant/teaching-assistant.mapper.ts`

Expose `speakerGender` in API responses.

#### Teaching assistant settings UI

Add a male/female selector tied to `speakerGender`.

The frontend file path is intentionally left unspecified in this spec because the exact settings form file was not traced during brainstorming.

## Validation Rules

### ai-ts

- `speakerGender` is required for TTS calls
- `VOICE_TTS_CONFIG.male` must be a non-empty string
- `VOICE_TTS_CONFIG.female` must be a non-empty string

### digi-talk

- `speakerGender` is required in persisted teaching assistant state
- create flow defaults `speakerGender` to `male`
- update flow may switch between `male` and `female`

## Error Handling

No silent fallback is introduced in the business flow.

If a downstream app misconfigures `ai.voices.tts`, the failure should happen at config validation or provider binding time, not by falling back to an arbitrary provider voice.

This is intentional:

- silent fallback would hide configuration mistakes
- persisted business intent should always deterministically map to one configured voice

## Testing Plan

### ai-ts

- unit tests for `VoiceBusiness` resolution behavior
- schema tests if needed for `speakerGender` validation
- local/remote mediator tests updated for the new payload shape

### digi-talk

- business tests for default `speakerGender: 'male'` on teaching assistant creation
- mapper/API tests for `speakerGender`
- migration verification
- UI form tests for create/update persistence where applicable

## Tradeoffs

### Advantages

- downstream apps persist business intent only
- provider voice IDs stay out of business code and database rows
- voice mapping changes become config-only
- architecture stays aligned with existing DI patterns

### Costs

- TTS request contract changes across `ai-ts` and downstream apps
- all existing `speaker` callers must migrate to `speakerGender`
- one more injected token is introduced into the voice domain

## Open Questions

None for this scope.

The agreed scope is:

- `speakerGender` is required
- `teaching_assistants` default to `male`
- mapping lives in `ai.voices.tts`
- `VOICE_TTS_CONFIG` is introduced in `voice.interface.ts`
