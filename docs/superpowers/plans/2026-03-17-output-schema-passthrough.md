# Output Schema Passthrough Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `outputSchema` from a persisted create-time concern to a per-call parameter on `send()`/`stream()`, removing it from the session persistence layer entirely.

**Architecture:** Remove `outputSchema` from the entire session persistence chain (DB schema, models, mappers, mediators, client schemas). Add `outputSchema?: ZodType` as a third parameter to `send()` and `stream()` on `IConversationEngine`. Build `GenerateOptions` at call time by merging cached base options with the per-call schema.

**Tech Stack:** TypeScript, Zod, Drizzle ORM, Vitest

**Spec:** `docs/superpowers/specs/2026-03-17-output-schema-passthrough-design.md`

---

### Task 1: Move outputSchema to send()/stream() parameters and remove from session persistence

This is a single atomic task so the codebase compiles at every commit point.

**Files:**
- Modify: `src/business/domain/conversation/conversation.model.ts:10-11` (remove outputSchema from ConversationConfig)
- Modify: `src/business/domain/conversation/conversation.interface.ts:24,38,48` (add param to send/stream, update JSDoc)
- Modify: `src/business/domain/conversation/conversation.business.ts` (rewrite engine internals)
- Modify: `src/repository/domain/session/session.schema.ts:13` (remove column)
- Modify: `src/business/domain/session/session.model.ts:16,40` (remove from interfaces)
- Modify: `src/business/domain/session/session.mapper.ts:15` (remove mapping)
- Modify: `src/business/domain/session/session.business.ts:40` (remove from start())
- Modify: `src/business/domain/session/client/schemas.ts:13` (remove from zod schema)
- Modify: `src/business/domain/session/client/queries.ts:31` (remove from command payload)
- Modify: `src/app/sdk/session-client/session.mapper.ts:22` (remove from client mapper)
- Modify: `src/app/sdk/session-client/session-local.mediator.ts:63` (remove conditional spread)
- Modify: `src/app/sdk/session-client/session-remote.mediator.ts:88` (remove from POST body)

- [ ] **Step 1: Remove `outputSchema` from ConversationConfig**

In `src/business/domain/conversation/conversation.model.ts`, remove lines 10-11:
```typescript
  /** JSON Schema describing the expected structured output, enabling structured-output mode. */
  readonly outputSchema?: unknown;
```

- [ ] **Step 2: Add ZodType import and update interface signatures**

In `src/business/domain/conversation/conversation.interface.ts`, add the import:
```typescript
import type { ZodType } from 'zod';
```

Change the `send` signature (line 38) from:
```typescript
  send(conversationId: string, message: string): Promise<ConversationResponse>;
```
to:
```typescript
  /**
   * Sends a message and returns the complete response.
   * @param conversationId - Target conversation ID.
   * @param message - User message text.
   * @param outputSchema - Optional Zod schema for structured output.
   * @returns The AI response containing text and optional structured object.
   * @throws {ConversationNotFoundError} If the conversation does not exist.
   * @throws {ConversationSendError} If the AI backend fails to produce a response.
   *
   * @example
   * ```ts
   * const response = await engine.send(conversation.id, 'Hello');
   * const structured = await engine.send(conversation.id, 'Evaluate', myZodSchema);
   * ```
   */
  send(conversationId: string, message: string, outputSchema?: ZodType): Promise<ConversationResponse>;
```

Change the `stream` signature (line 48) from:
```typescript
  stream(conversationId: string, message: string): AsyncIterable<StreamChunk>;
```
to:
```typescript
  /**
   * Sends a message and returns a streaming response.
   * @param conversationId - Target conversation ID.
   * @param message - User message text.
   * @param outputSchema - Optional Zod schema for structured output.
   * @returns An async iterable of streamed chunks.
   * @throws {ConversationNotFoundError} If the conversation does not exist.
   * @throws {ConversationSendError} If the AI backend fails to produce a response.
   *
   * @example
   * ```ts
   * for await (const chunk of engine.stream(conversation.id, 'Hello', myZodSchema)) {
   *   console.log(chunk.content);
   * }
   * ```
   */
  stream(conversationId: string, message: string, outputSchema?: ZodType): AsyncIterable<StreamChunk>;
```

Remove `outputSchema` from the `create()` JSDoc `@example` block (line 24):
```typescript
   *   outputSchema: { type: 'object', properties: { answer: { type: 'string' } } },
```

- [ ] **Step 3: Rewrite ConversationEngine internals**

In `src/business/domain/conversation/conversation.business.ts`:

Change the `import { ZodType } from 'zod';` (line 24) to a type-only import:
```typescript
import type { ZodType } from 'zod';
```

Replace the `ConversationState` interface (lines 26-34) with:
```typescript
interface ConversationState {
  readonly sessionId: string;
  readonly mastraThreadId: string;
  readonly promptSlug: string;
  readonly resolvedPrompt: string;
  readonly model: string;
  readonly userId: string;
  readonly baseOptions: { readonly threadId: string; readonly resourceId: string };
}
```

In `create()`, remove `outputSchema: config.outputSchema` from the `CreateSessionCommand` call (line 70) and replace the state construction (lines 75-83) with:
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

Replace `send()` (lines 95-106) with:
```typescript
  async send(conversationId: string, message: string, outputSchema?: ZodType): Promise<ConversationResponse> {
    const state = await this.getOrReconstructState(conversationId);
    const options: GenerateOptions = outputSchema
      ? { ...state.baseOptions, outputSchema }
      : state.baseOptions;
    try {
      const response = await this.mastraAgent.generate(message, options);
      return { text: response.text, object: response.object };
    } catch (error) {
      if (isMastraAdapterError(error)) {
        throw new ConversationSendError(conversationId, error);
      }
      throw error;
    }
  }
```

Replace `stream()` (lines 108-118) with:
```typescript
  async *stream(conversationId: string, message: string, outputSchema?: ZodType): AsyncIterable<StreamChunk> {
    const state = await this.getOrReconstructState(conversationId);
    const options: GenerateOptions = outputSchema
      ? { ...state.baseOptions, outputSchema }
      : state.baseOptions;
    try {
      yield* this.mastraAgent.stream(message, options);
    } catch (error) {
      if (isMastraAdapterError(error)) {
        throw new ConversationSendError(conversationId, error);
      }
      throw error;
    }
  }
```

Remove `buildGenerateOptions()` (lines 120-125) entirely.

Replace `getOrReconstructState()` state construction (lines 145-153) with:
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

- [ ] **Step 4: Remove `outputSchema` column from Drizzle schema**

In `src/repository/domain/session/session.schema.ts`, remove line 13:
```typescript
  outputSchema: jsonb('output_schema').$type<unknown>(),
```

- [ ] **Step 5: Remove `outputSchema` from Session and StartSessionInput interfaces**

In `src/business/domain/session/session.model.ts`:

Remove from `Session` interface (line 16):
```typescript
  readonly outputSchema: unknown;
```

Remove from `StartSessionInput` interface (line 40):
```typescript
  readonly outputSchema?: unknown;
```

- [ ] **Step 6: Remove `outputSchema` from business-layer mapper**

In `src/business/domain/session/session.mapper.ts`, remove line 15 from `toSessionFromRecord()`:
```typescript
    outputSchema: record.outputSchema,
```

- [ ] **Step 7: Remove `outputSchema` from session business logic**

In `src/business/domain/session/session.business.ts`, remove line 40 from `start()`:
```typescript
      outputSchema: input.outputSchema ?? null,
```

- [ ] **Step 8: Remove `outputSchema` from client schemas**

In `src/business/domain/session/client/schemas.ts`, remove line 13 from `sessionClientModelSchema`:
```typescript
  outputSchema: z.unknown().nullable(),
```

- [ ] **Step 9: Remove `outputSchema` from CreateSessionCommand payload**

In `src/business/domain/session/client/queries.ts`, remove line 31 from the `CreateSessionCommand` payload:
```typescript
    outputSchema: z.unknown().optional()
```

- [ ] **Step 10: Remove `outputSchema` from SDK-layer mapper**

In `src/app/sdk/session-client/session.mapper.ts`, remove line 22 from `toSessionClientModelFromBusiness()`:
```typescript
    outputSchema: session.outputSchema,
```

- [ ] **Step 11: Remove `outputSchema` from local mediator**

In `src/app/sdk/session-client/session-local.mediator.ts`, remove line 63:
```typescript
      ...(command.outputSchema !== undefined ? { outputSchema: command.outputSchema } : {}),
```

- [ ] **Step 12: Remove `outputSchema` from remote mediator**

In `src/app/sdk/session-client/session-remote.mediator.ts`, remove line 88 from the POST body:
```typescript
      outputSchema: command.outputSchema,
```

- [ ] **Step 13: Verify TypeScript compilation**

Run: `pnpm tsc --noEmit`
Expected: Compilation errors only in test files (will be fixed in Task 2). All main source files should compile cleanly.

- [ ] **Step 14: Commit**

```bash
git add src/business/domain/conversation/conversation.model.ts \
  src/business/domain/conversation/conversation.interface.ts \
  src/business/domain/conversation/conversation.business.ts \
  src/repository/domain/session/session.schema.ts \
  src/business/domain/session/session.model.ts \
  src/business/domain/session/session.mapper.ts \
  src/business/domain/session/session.business.ts \
  src/business/domain/session/client/schemas.ts \
  src/business/domain/session/client/queries.ts \
  src/app/sdk/session-client/session.mapper.ts \
  src/app/sdk/session-client/session-local.mediator.ts \
  src/app/sdk/session-client/session-remote.mediator.ts
git commit -m "refactor(conversation): move outputSchema from session persistence to per-call send()/stream() parameter"
```

---

### Task 2: Update tests

**Files:**
- Modify: `src/__tests__/integration/conversation/conversation-flow.spec.ts`
- Modify: `src/business/domain/session/session.business.spec.ts`

- [ ] **Step 1: Update session unit test fixtures**

In `src/business/domain/session/session.business.spec.ts`, remove all `outputSchema: null` lines from mock `SessionRecord` objects. There are 5 occurrences at lines 34, 71, 85, 105, 133.

- [ ] **Step 2: Run session unit tests to verify**

Run: `pnpm vitest run --project unit src/business/domain/session/session.business.spec.ts`
Expected: All tests pass.

- [ ] **Step 3: Update integration test mediator**

In `src/__tests__/integration/conversation/conversation-flow.spec.ts`, update the `createTestMediator` function. In the `CreateSessionCommand` handler (line 41), remove the `outputSchema` spread:
```typescript
          ...(request.outputSchema !== undefined ? { outputSchema: request.outputSchema } : {}),
```

So the handler becomes:
```typescript
        const result = await ctx.sessionService.start({
          userId: request.userId,
          promptSlug: request.promptSlug,
          resolvedPrompt: request.resolvedPrompt,
          purpose: request.purpose,
        });
```

- [ ] **Step 4: Rewrite the "passes outputSchema" test to use send() parameter**

Replace the test at lines 174-198 with:
```typescript
  it('passes outputSchema as structuredOutput to the Mastra agent via send()', async () => {
    const schema = z.object({ answer: z.string(), confidence: z.number() });

    ctx.mastraAgent.generate.mockResolvedValue({
      text: '',
      object: { answer: 'Paris', confidence: 0.95 },
      threadId: 'thread-1',
    });

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'geography' },
      userId: 'user-1',
      purpose: 'quiz',
    });

    const response = await engine.send(conversation.id, 'What is the capital of France?', schema);

    expect(response.object).toEqual({ answer: 'Paris', confidence: 0.95 });
    expect(ctx.mastraAgent.generate).toHaveBeenCalledWith(
      'What is the capital of France?',
      expect.objectContaining({ outputSchema: schema }),
    );
  });
```

- [ ] **Step 5: Remove the "persists outputSchema" test**

Delete the test at lines 200-231 ("persists outputSchema in session and uses it after state reconstruction") entirely.

- [ ] **Step 6: Verify existing "does not pass outputSchema" test**

The existing test at lines 233-251 ("does not pass outputSchema when none is provided") already covers the no-schema case. Verify it still passes by checking the assertion `expect(callOptions?.outputSchema).toBeUndefined()` is present.

- [ ] **Step 7: Add test for stream() with outputSchema**

Add a new test after the existing outputSchema tests:
```typescript
  it('passes outputSchema to the Mastra agent via stream()', async () => {
    const schema = z.object({ feedback: z.string() });

    const mockChunks = [
      { type: 'text-delta' as const, content: 'chunk' },
      { type: 'finish' as const, content: '' },
    ];
    ctx.mastraAgent.stream.mockReturnValue((async function* () {
      for (const chunk of mockChunks) yield chunk;
    })());

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'geography' },
      userId: 'user-1',
      purpose: 'quiz',
    });

    const chunks: unknown[] = [];
    for await (const chunk of engine.stream(conversation.id, 'Evaluate my answer', schema)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(ctx.mastraAgent.stream).toHaveBeenCalledWith(
      'Evaluate my answer',
      expect.objectContaining({ outputSchema: schema }),
    );
  });
```

- [ ] **Step 8: Add test for different schemas per call**

Add a new test:
```typescript
  it('allows different outputSchema per send() call', async () => {
    const schemaA = z.object({ answer: z.string() });
    const schemaB = z.object({ score: z.number() });

    ctx.mastraAgent.generate
      .mockResolvedValueOnce({ text: '', object: { answer: 'Paris' }, threadId: 'thread-1' })
      .mockResolvedValueOnce({ text: '', object: { score: 95 }, threadId: 'thread-1' });

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'geography' },
      userId: 'user-1',
      purpose: 'quiz',
    });

    await engine.send(conversation.id, 'Question 1', schemaA);
    await engine.send(conversation.id, 'Question 2', schemaB);

    expect(ctx.mastraAgent.generate).toHaveBeenNthCalledWith(
      1,
      'Question 1',
      expect.objectContaining({ outputSchema: schemaA }),
    );
    expect(ctx.mastraAgent.generate).toHaveBeenNthCalledWith(
      2,
      'Question 2',
      expect.objectContaining({ outputSchema: schemaB }),
    );
  });
```

- [ ] **Step 9: Run all tests**

Run: `pnpm test`
Expected: All unit and integration tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/__tests__/integration/conversation/conversation-flow.spec.ts \
  src/business/domain/session/session.business.spec.ts
git commit -m "test(conversation): update tests for per-call outputSchema"
```

---

### Task 3: Update documentation

**Files:**
- Modify: `docs/conversation/usage.md`

- [ ] **Step 1: Remove `outputSchema` from ConversationConfig table**

In `docs/conversation/usage.md`, remove the row at line 36:
```
| `outputSchema` | `unknown`                 | No       | Schema for structured output from the agent |
```

- [ ] **Step 2: Update send() example with outputSchema**

Replace the send example (lines 68-72) with:
```typescript
const response = await engine.send(conversation.id, 'Help me with Part 2');
// response.text   -> the agent's reply
// response.object -> undefined (no schema provided)

// With structured output:
import { z } from 'zod';
const schema = z.object({ feedback: z.string(), score: z.number() });
const structured = await engine.send(conversation.id, 'Evaluate my answer', schema);
// structured.object -> { feedback: '...', score: 8.5 }
```

- [ ] **Step 3: Update stream() example with outputSchema mention**

After the existing stream example (lines 78-83), add:
```typescript
// With structured output:
for await (const chunk of engine.stream(conversation.id, 'Evaluate', schema)) {
  // Same streaming interface, schema passed as third param
}
```

- [ ] **Step 4: Commit**

```bash
git add docs/conversation/usage.md
git commit -m "docs(conversation): update usage for per-call outputSchema"
```
