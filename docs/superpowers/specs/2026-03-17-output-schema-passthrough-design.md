# Output Schema Passthrough Design

## Problem

The conversation engine currently accepts `outputSchema` (a Zod schema) at `create()` time and persists it as JSONB in the `ai_sessions.output_schema` column. On state reconstruction (multi-instance scenarios), the serialized schema is read back from the database. However, Zod schemas lose their class identity through JSON serialization, so `instanceof ZodType` fails on reconstruction — breaking structured output for any conversation that wasn't created by the same process.

## Decision

Move `outputSchema` from a create-time, persisted concern to a per-call parameter on `send()` and `stream()`. ai-ts no longer stores or reconstructs the schema. The downstream app is responsible for passing it on every call that needs structured output.

## Public API Changes

### Before

```typescript
interface ConversationConfig {
  readonly promptSlug: string;
  readonly promptParams: Record<string, unknown>;
  readonly userId: string;
  readonly tenantId?: string;
  readonly purpose: string;
  readonly model?: string;
  readonly outputSchema?: unknown;
}

interface IConversationEngine {
  create(config: ConversationConfig): Promise<Conversation>;
  send(conversationId: string, message: string): Promise<ConversationResponse>;
  stream(conversationId: string, message: string): AsyncIterable<StreamChunk>;
}
```

### After

```typescript
interface ConversationConfig {
  readonly promptSlug: string;
  readonly promptParams: Record<string, unknown>;
  readonly userId: string;
  readonly tenantId?: string;
  readonly purpose: string;
  readonly model?: string;
  // outputSchema removed
}

interface IConversationEngine {
  create(config: ConversationConfig): Promise<Conversation>;
  send(conversationId: string, message: string, outputSchema?: ZodType): Promise<ConversationResponse>;
  stream(conversationId: string, message: string, outputSchema?: ZodType): AsyncIterable<StreamChunk>;
}
```

Key properties:
- `outputSchema` is optional on every `send()`/`stream()` call
- Each call independently decides whether to use structured output
- Typed as `ZodType` for compile-time safety (not `unknown`)
- `conversation.interface.ts` needs `import type { ZodType } from 'zod'`

## Internal Engine Changes

### ConversationState

Replace cached `generateOptions` (which included the schema) with base options containing only `threadId` and `resourceId`:

```typescript
interface ConversationState {
  readonly sessionId: string;
  readonly mastraThreadId: string;
  readonly promptSlug: string;
  readonly resolvedPrompt: string;
  readonly model: string;
  readonly userId: string;
  readonly baseOptions: { threadId: string; resourceId: string };
}
```

### send() and stream()

Build `GenerateOptions` at call time by merging base options with the per-call schema:

```typescript
async send(conversationId: string, message: string, outputSchema?: ZodType): Promise<ConversationResponse> {
  const state = await this.getOrReconstructState(conversationId);
  const options: GenerateOptions = outputSchema
    ? { ...state.baseOptions, outputSchema }
    : state.baseOptions;
  const response = await this.mastraAgent.generate(message, options);
  return { text: response.text, object: response.object };
}
```

### create()

Stop passing `outputSchema` to `CreateSessionCommand`. Build `baseOptions` instead of `generateOptions`:

```typescript
const state: ConversationState = {
  sessionId: session.id,
  mastraThreadId: session.mastraThreadId,
  promptSlug: config.promptSlug,
  resolvedPrompt: prompt.text,
  model,
  userId: config.userId,
  baseOptions: { threadId: session.mastraThreadId, resourceId: config.userId },
};
```

### getOrReconstructState()

No longer reads `session.outputSchema`. Builds `baseOptions` instead of `generateOptions`:

```typescript
const state: ConversationState = {
  sessionId: session.id,
  mastraThreadId: session.mastraThreadId,
  promptSlug: session.promptSlug,
  resolvedPrompt: session.resolvedPrompt,
  model: this.config.defaultModel,
  userId: session.userId,
  baseOptions: { threadId: session.mastraThreadId, resourceId: session.userId },
};
```

### Removed

- `buildGenerateOptions()` method — no longer needed
- `import { ZodType } from 'zod'` in `conversation.business.ts` — type import moves to `conversation.interface.ts`

## Session Layer Cleanup

Remove `outputSchema` from the entire persistence chain:

| File | Change |
|------|--------|
| `session.model.ts` | Remove from `Session` and `StartSessionInput` interfaces |
| `session.schema.ts` | Remove `outputSchema` column from `aiSessions` pgTable |
| `session.mapper.ts` (business layer) | Remove outputSchema mapping |
| `session.mapper.ts` (SDK layer at `app/sdk/session-client/`) | Remove outputSchema from `toSessionClientModelFromBusiness()` |
| `session/client/queries.ts` | Remove from `CreateSessionCommand` payload |
| `session/client/schemas.ts` | Remove from `sessionClientModelSchema` |
| `session.business.ts` | Remove from `start()` persistence call |
| `session-local.mediator.ts` | Remove any outputSchema references |
| `session-remote.mediator.ts` | Remove `outputSchema` from HTTP POST body in `create()` |

### Database Migration

ai-ts only removes the column from the Drizzle schema definition. The downstream app is responsible for running the actual DB migration to drop the column.

### Transitively Affected

- `repository/domain/session/session.model.ts` — `SessionRecord` and `NewSessionRecord` types are inferred from the Drizzle schema via `InferSelectModel`/`InferInsertModel`, so they update automatically when the column is removed.
- `mastra.interface.ts` and `mastra.agent.ts` — **unchanged**. `GenerateOptions.outputSchema?: ZodType` remains as-is; the adapter already handles optional schema correctly.

### Documentation

- `docs/conversation/usage.md` — update examples to show `outputSchema` on `send()`/`stream()` instead of `create()`.

## Test Changes

Rewrite integration tests in `conversation-flow.spec.ts`:

Update unit tests in `session.business.spec.ts`:
- Remove `outputSchema: null` from mock `SessionRecord` fixtures

- **Remove**: Tests for outputSchema persistence in session and reconstruction from DB
- **Add**: Test passing `outputSchema` as third param to `send()` — verify it reaches `mastraAgent.generate()` with correct schema
- **Add**: Test passing `outputSchema` as third param to `stream()` — verify it reaches `mastraAgent.stream()` with correct schema
- **Add**: Test that `send()`/`stream()` without `outputSchema` works (no schema in generate options)
- **Add**: Test that different calls can pass different schemas independently

## Breaking Changes

This is a breaking change for downstream apps that:
1. Pass `outputSchema` to `engine.create()` — must move to passing it on `send()`/`stream()` calls
2. Rely on the `output_schema` column in `ai_sessions` — must run a migration to drop it
