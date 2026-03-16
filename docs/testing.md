# Testing

`@sanamyvn/ai-ts` ships mock factories for every interface in its public API. Each factory returns an object whose methods are typed `vi.fn()` stubs, so `.mockResolvedValue()` and other Vitest helpers work with full TypeScript inference.

## Mock Factories

| Factory | Import Path | Mocks |
|---------|-------------|-------|
| `createMockPromptRepository()` | `@sanamyvn/ai-ts/repository/prompt/testing` | `IPromptRepository` |
| `createMockPromptVersionRepository()` | `@sanamyvn/ai-ts/repository/prompt-version/testing` | `IPromptVersionRepository` |
| `createMockSessionRepository()` | `@sanamyvn/ai-ts/repository/session/testing` | `ISessionRepository` |
| `createMockPromptService()` | `@sanamyvn/ai-ts/business/prompt/testing` | `IPromptService` |
| `createMockSessionService()` | `@sanamyvn/ai-ts/business/session/testing` | `ISessionService` |
| `createMockConversationEngine()` | `@sanamyvn/ai-ts/business/conversation/testing` | `IConversationEngine` |
| `createMockMastraAgent()` | `@sanamyvn/ai-ts/business/mastra/testing` | `IMastraAgent` |
| `createMockMastraMemory()` | `@sanamyvn/ai-ts/business/mastra/testing` | `IMastraMemory` |

Every stub is declared as `vi.fn<Interface['method']>()`. This means TypeScript enforces the correct argument and return types when you call `.mockResolvedValue()`, `.mockReturnValue()`, or `.mockImplementation()`.

## Unit Test Pattern

Use the mock factories to isolate the unit under test from its dependencies. The example below tests a hypothetical `ChatController` that depends on `IConversationEngine`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockConversationEngine } from '@sanamyvn/ai-ts/business/conversation/testing';
import { ChatController } from './chat.controller.js';

describe('ChatController', () => {
  let engine: ReturnType<typeof createMockConversationEngine>;
  let controller: ChatController;

  beforeEach(() => {
    engine = createMockConversationEngine();
    controller = new ChatController(engine);
  });

  it('creates a conversation and returns its id', async () => {
    engine.create.mockResolvedValue({
      id: 'conv-1',
      sessionId: 'sess-1',
      promptSlug: 'greet',
      resolvedPrompt: 'Hello {{name}}',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    const result = await controller.start({
      promptSlug: 'greet',
      promptParams: { name: 'World' },
      userId: 'user-1',
      purpose: 'demo',
    });

    expect(result.id).toBe('conv-1');
    expect(engine.create).toHaveBeenCalledWith(
      expect.objectContaining({ promptSlug: 'greet' }),
    );
  });

  it('sends a message and returns the response text', async () => {
    engine.send.mockResolvedValue({
      text: 'Hi there!',
      object: undefined,
    });

    const response = await controller.send('conv-1', 'Hello');

    expect(response.text).toBe('Hi there!');
    expect(engine.send).toHaveBeenCalledWith('conv-1', 'Hello');
  });
});
```

Key points:

- Call the factory in `beforeEach` so each test starts with fresh stubs.
- Set return values with `.mockResolvedValue()` before calling the code under test.
- Assert both the result and how the mock was called.

## Integration Tests

The package uses foundation's `createPostgresFixture()` to run integration tests against an isolated Postgres schema. The fixture handles container lifecycle, migrations, and cleanup.

See the [foundation testing docs](https://github.com/sanamyvn/foundation) for the full fixture API.

### Internal Test Context

Inside `@sanamyvn/ai-ts`, integration tests use an internal helper called `createAiTestContext()`. This helper wires real Drizzle repositories and real service implementations against the Postgres fixture, while keeping Mastra interactions as mocks:

```typescript
// Internal to @sanamyvn/ai-ts -- shown here as a reference pattern.
// Downstream apps should build their own test context using the
// exported mock factories listed above.

import { createPostgresFixture } from '@sanamyvn/foundation/testing/postgres';
import { aiSchema } from '@/shared/schema.js';

export const pg = createPostgresFixture({ schema: aiSchema });

export function createAiTestContext(): AiTestContext {
  const client = wrapAsPostgresClient();       // shim around pg.db
  const promptRepo = new PromptDrizzleRepository(client);
  const versionRepo = new PromptVersionDrizzleRepository(client);
  const sessionRepo = new SessionDrizzleRepository(client);

  const promptService = new PromptService(promptRepo, versionRepo);

  const mastraAgent = createMockMastraAgent();  // still mocked
  const mastraMemory = createMockMastraMemory();
  const sessionService = new SessionService(sessionRepo, mastraMemory);

  return {
    promptRepo, versionRepo, sessionRepo,
    promptService, sessionService,
    mastraAgent, mastraMemory,
  };
}
```

### Lifecycle Structure

Integration tests follow this lifecycle:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { pg } from '../fixture.js';
import { createAiTestContext, type AiTestContext } from '../helpers.js';

describe('Feature / Integration', () => {
  let ctx: AiTestContext;

  beforeAll(async () => {
    await pg.start();             // start container, run migrations
  });

  afterAll(async () => {
    await pg.stop();              // tear down container
  });

  beforeEach(() => {
    ctx = createAiTestContext();   // fresh repos and mocks per test
  });

  afterEach(async () => {
    await pg.truncateAll();        // clear all rows between tests
  });

  it('does something with real database access', async () => {
    await ctx.promptService.create({
      name: 'Test Prompt',
      slug: 'test-prompt',
      parameterSchema: { topic: { type: 'string' } },
    });

    const prompt = await ctx.promptService.getBySlug('test-prompt');
    expect(prompt.slug).toBe('test-prompt');
  });
});
```

The pattern in brief:

- `beforeAll` / `afterAll` manage the Postgres container lifecycle.
- `beforeEach` creates a fresh context with new repository and service instances.
- `afterEach` truncates all tables so tests stay isolated.
- Mastra stubs (`mastraAgent`, `mastraMemory`) require explicit `.mockResolvedValue()` setup in each test that exercises them.
