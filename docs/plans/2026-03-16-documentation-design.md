# AI Package Documentation Design

Package: `@sanamyvn/ai-ts`

## Goal

Add comprehensive developer documentation so team members can integrate `@sanamyvn/ai-ts` into downstream apps (teacher platform, IELTS app) without reading source code. Also add JSDoc to all public interfaces so IDEs surface parameter descriptions, return semantics, and usage examples.

## Audience

Internal team developers who already know the foundation DI, mediator, and layered architecture patterns. Docs reference those concepts without re-explaining them.

## Constraints

- All prose follows Strunk's rules: active voice, positive form, concrete language, no needless words
- All diagrams use Mermaid v11 syntax
- All code examples and import paths verified against the actual codebase and `@sanamyvn/foundation`
- Route tables reference DTO types — no curl examples

## File Structure

```
docs/
├── README.md                        # Index — links to every doc
├── getting-started.md               # 5-min quickstart
├── integration.md                   # Full app wiring walkthrough
├── configuration.md                 # aiConfigSchema reference
├── customization.md                 # Swap implementations, deployment modes
├── testing.md                       # Mock factories, unit/integration patterns
├── prompt/
│   ├── setup.md                     # Module wiring + middleware config
│   ├── usage.md                     # Create, version, resolve templates
│   └── endpoints.md                 # Route table + DTO types
├── session/
│   ├── setup.md                     # Module wiring + middleware config
│   ├── usage.md                     # Lifecycle, messages, transcripts
│   └── endpoints.md                 # Route table + DTO types
├── conversation/
│   ├── setup.md                     # Module wiring + middleware config
│   ├── usage.md                     # Create, send, stream, reconstruction
│   └── endpoints.md                 # Route table + DTO types
└── plans/                           # Existing design/plan docs (untouched)
```

Total: 15 documentation files + JSDoc additions + README update.

---

## Cross-Cutting Guides

### docs/README.md

Table of contents linking every doc. Three groups:

1. **Start Here** — Getting Started, Integration Guide
2. **Features** — Prompt (setup → usage → endpoints), Session (same), Conversation (same)
3. **Reference** — Configuration, Customization, Testing

Each link has a one-line description of what the doc covers.

### docs/getting-started.md

**Purpose:** Working conversation in 5 minutes.

**Assumes:** Developer has a foundation app with DI container, a Postgres database, and a configured Mastra agent.

**Sections:**

1. **Install** — `pnpm add @sanamyvn/ai-ts` plus peer dependencies (`@sanamyvn/foundation`, `@mastra/core`, `drizzle-orm`, `zod`)
2. **Provide infrastructure tokens** — Bind `AI_DB` (from `@sanamyvn/ai-ts/shared/tokens`) to your `PostgresClient<AiSchema>`, bind `MASTRA_CORE_AGENT` and `MASTRA_CORE_MEMORY` to your Mastra instances
3. **Register modules** — Minimal monolith wiring: `PromptAppModule.forRoot()`, `SessionAppModule.forRoot()`, `ConversationAppModule.forMonolith()`, plus all three `*ClientMonolithProviders()`
4. **Create a prompt** — Call `IPromptService.create()` with name, slug, parameter schema; then `createVersion()` with a Mustache template and `activate: true`
5. **Start a conversation** — Call `IConversationEngine.create()` with `promptSlug`, `promptParams`, `userId`, `purpose`; then `send()` with a message

Code examples show the full import paths and token bindings. Each step is 5–10 lines of code.

### docs/integration.md

**Purpose:** Complete walkthrough for wiring `@sanamyvn/ai-ts` into a real app.

**Sections:**

1. **Project structure** — Where AI modules sit alongside your own modules. Shows a typical `src/` layout with AI module imports.

2. **Database setup** — How to provide the `AI_DB` token. The package uses `PostgresClient<AiSchema>` from foundation. Developer either:
   - Shares their existing Postgres module with an alias: `alias(AI_DB, APP_DB)`
   - Creates a separate Postgres connection for AI tables

   Includes the Drizzle schema exports (`aiPrompts`, `aiPromptVersions`, `aiSessions`) and how to include them in migrations.

3. **Mastra setup** — Bind `MASTRA_CORE_AGENT` to a `@mastra/core` `Agent` instance and `MASTRA_CORE_MEMORY` to a `MastraMemory` instance. The adapter layer (`MastraAgentAdapter`, `MastraMemoryAdapter`) wraps them automatically via DI.

4. **Module registration** — Full example showing all three app modules with per-route middleware:

   ```typescript
   PromptAppModule.forRoot({
     middleware: {
       create: [AuthMiddleware, RoleMiddleware.require('admin')],
       list: [AuthMiddleware],
       getBySlug: [AuthMiddleware],
       update: [AuthMiddleware],
       createVersion: [AuthMiddleware],
       activateVersion: [AuthMiddleware, RoleMiddleware.require('admin')],
       listVersions: [AuthMiddleware],
     },
   });
   ```

   Similar examples for `SessionAppModule.forRoot()` and `ConversationAppModule.forMonolith()`.

5. **Mediator client wiring** — Register `promptClientMonolithProviders()`, `sessionClientMonolithProviders()`, `conversationClientMonolithProviders()` so the mediator routes cross-domain calls in-process.

6. **Diagram: Module dependency graph** — Mermaid flowchart showing how app modules, business providers, repository providers, mediator clients, and infrastructure tokens connect.

### docs/configuration.md

**Purpose:** Reference for `aiConfigSchema`.

**Content:**

| Field                        | Type     | Default                                | Description                             |
| ---------------------------- | -------- | -------------------------------------- | --------------------------------------- |
| `defaultModel`               | `string` | `'anthropic/claude-sonnet-4-20250514'` | Model identifier passed to Mastra agent |
| `prompt.maxVersions`         | `number` | `50`                                   | Maximum versions per prompt template    |
| `session.transcriptPageSize` | `number` | `100`                                  | Messages per page in transcript export  |

Shows how to provide config:

```typescript
import { value } from '@sanamyvn/foundation/di/core/providers';
import { AI_CONFIG, aiConfigSchema } from '@sanamyvn/ai-ts/config';

value(AI_CONFIG, aiConfigSchema.parse({ defaultModel: 'openai/gpt-4o' }));
```

### docs/customization.md

**Purpose:** Extend or replace default implementations.

**Sections:**

1. **Deployment modes** — Monolith vs standalone. Mermaid diagram showing:
   - Monolith: all domains in one process, local mediators, shared database
   - Standalone: conversation service calls prompt/session services over HTTP

   Switching modes: replace `*ClientMonolithProviders()` with `*ClientStandaloneProviders({ baseUrl, httpClientToken })`. Zero changes in business code.

2. **Custom middleware** — Per-route middleware config gives full control. Examples for different auth systems (iam-ts, Supabase). Each middleware config type listed with its operations:
   - `PromptMiddlewareConfig`: `create`, `list`, `getBySlug`, `update`, `createVersion`, `activateVersion`, `listVersions`
   - `SessionMiddlewareConfig`: `list`, `get`, `getMessages`, `exportTranscript`, `end`
   - `ConversationMiddlewareConfig`: `create`, `sendMessage`, `streamMessage`

3. **Custom repositories** — Implement `IPromptRepository`, `IPromptVersionRepository`, or `ISessionRepository` for non-Postgres backends. Bind your implementation to the token. The business layer never knows.

4. **Custom Mastra integration** — Implement `IMastraAgent` or `IMastraMemory` directly (bypassing the default adapters) for custom agent behavior. Bind to `MASTRA_AGENT` / `MASTRA_MEMORY`.

### docs/testing.md

**Purpose:** How to test code that depends on `@sanamyvn/ai-ts`.

**Sections:**

1. **Mock factories** — Every public service and repository has a mock factory. Table listing:

   | Factory                               | Import Path                                         | What It Mocks              |
   | ------------------------------------- | --------------------------------------------------- | -------------------------- |
   | `createMockPromptRepository()`        | `@sanamyvn/ai-ts/repository/prompt/testing`         | `IPromptRepository`        |
   | `createMockPromptVersionRepository()` | `@sanamyvn/ai-ts/repository/prompt-version/testing` | `IPromptVersionRepository` |
   | `createMockSessionRepository()`       | `@sanamyvn/ai-ts/repository/session/testing`        | `ISessionRepository`       |
   | `createMockPromptService()`           | `@sanamyvn/ai-ts/business/prompt/testing`           | `IPromptService`           |
   | `createMockSessionService()`          | `@sanamyvn/ai-ts/business/session/testing`          | `ISessionService`          |
   | `createMockConversationEngine()`      | `@sanamyvn/ai-ts/business/conversation/testing`     | `IConversationEngine`      |
   | `createMockMastraAgent()`             | `@sanamyvn/ai-ts/business/mastra/testing`           | `IMastraAgent`             |
   | `createMockMastraMemory()`            | `@sanamyvn/ai-ts/business/mastra/testing`           | `IMastraMemory`            |

   Most mocks use `vi.fn<Interface['method']>()` so `.mockResolvedValue()` works with TypeScript. The prompt service mock (`createMockPromptService()`) currently uses untyped `vi.fn()` — fix this to match the typed pattern before documenting it.

2. **Unit test pattern** — Example: testing a downstream service that calls `IConversationEngine.create()`:
   - Create mock with `createMockConversationEngine()`
   - Set up return values with `.mockResolvedValue()`
   - Assert calls and results

3. **Integration test setup** — The package uses foundation's `createPostgresFixture({ schema: aiSchema })` for integration tests. Reference the foundation testing docs for the fixture API (`pg.start()`, `pg.stop()`, `pg.truncateAll()`). The internal helper `createAiTestContext()` (in `src/__tests__/integration/helpers.ts`) wires real repos + mocked Mastra into a test context — show the pattern but note it is internal to this package, not an exported API. Downstream apps build their own test contexts using the exported mock factories.

   Example test structure with `beforeAll`, `afterAll`, `beforeEach`, `afterEach`.

---

## Per-Feature Documentation

Each feature follows the same three-file template.

### Prompt Domain

#### docs/prompt/setup.md

**Sections:**

1. **App module** — `PromptAppModule.forRoot({ middleware })` with `PromptMiddlewareConfig` showing all 7 operations
2. **Mediator client** — `promptClientMonolithProviders()` for in-process, `promptClientStandaloneProviders({ baseUrl, httpClientToken })` for HTTP
3. **Required tokens** — `AI_DB`, `AI_CONFIG`, `PROMPT_REPOSITORY` (auto-bound), `PROMPT_VERSION_REPOSITORY` (auto-bound)
4. **Diagram** — Mermaid flowchart: PromptAppModule → PromptRouter → PromptAppService → mediator → PromptLocalMediator → PromptService → repos

#### docs/prompt/usage.md

**Sections:**

1. **Create a prompt template** — `IPromptService.create({ name, slug, parameterSchema, metadata })`. Explain `parameterSchema` format: JSON key-type map (`{ "topic": { "type": "string" }, "count": { "type": "number", "min": 1 } }`).
2. **Manage versions** — `createVersion(promptId, { template, activate })`, `listVersions(promptId)`, `setActiveVersion(promptId, versionId)`. Explain: one active version per prompt, version numbers auto-increment.
3. **Resolve a template** — `resolve(slug, params)` finds the active version, validates params against the stored schema, renders with Mustache, returns `ResolvedPrompt { slug, version, text }`.
4. **Error handling** — Table:

   | Error                          | When                                  |
   | ------------------------------ | ------------------------------------- |
   | `PromptNotFoundError`          | Slug not found or no active version   |
   | `PromptAlreadyExistsError`     | Duplicate slug on create              |
   | `PromptVersionNotFoundError`   | Version ID not found during setActive |
   | `InvalidPromptParametersError` | Params fail schema validation         |
   | `PromptRenderError`            | Mustache template rendering fails     |

   Import paths for error classes and type guards (`isPromptNotFoundError()`, etc.)

#### docs/prompt/endpoints.md

Route table:

| Method | Path                                      | Operation         | Request DTO                  | Response DTO                                                                          |
| ------ | ----------------------------------------- | ----------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| `POST` | `/ai/prompts`                             | `create`          | `createPromptDto`            | `promptResponseDto`                                                                   |
| `GET`  | `/ai/prompts`                             | `list`            | `promptListQueryDto` (query) | `promptResponseDto[]`                                                                 |
| `GET`  | `/ai/prompts/:slug`                       | `getBySlug`       | —                            | `promptResponseDto`                                                                   |
| `PUT`  | `/ai/prompts/:slug`                       | `update`          | `updatePromptDto`            | `promptResponseDto`                                                                   |
| `POST` | `/ai/prompts/:slug/versions`              | `createVersion`   | `createVersionDto`           | `promptResponseDto`                                                                   |
| `PUT`  | `/ai/prompts/:slug/versions/:id/activate` | `activateVersion` | —                            | 204                                                                                   |
| `GET`  | `/ai/prompts/:slug/versions`              | `listVersions`    | —                            | `promptResponseDto` (returns the prompt with its active version — not a version list) |

DTO types are internal to the router — they are not exported from `package.json`. The route table references them by name for documentation purposes. Developers who need the exact shapes can check the Zod schemas in `src/app/domain/prompt/prompt.dto.ts`.

Note: Operation names in the table match the middleware config keys, so developers can cross-reference which middleware applies to which route.

### Session Domain

#### docs/session/setup.md

Same structure as prompt. `SessionAppModule.forRoot({ middleware })` with `SessionMiddlewareConfig` (5 operations: `list`, `get`, `getMessages`, `exportTranscript`, `end`). Mediator client: `sessionClientMonolithProviders()` / `sessionClientStandaloneProviders()`.

#### docs/session/usage.md

**Sections:**

1. **Start a session** — `ISessionService.start({ userId, tenantId?, promptSlug, resolvedPrompt, purpose, metadata? })`. Creates a Mastra thread via `IMastraMemory.createThread()`, then a row in `ai_sessions` linking them via `mastraThreadId`. Note: `resolvedPrompt` is required — the conversation engine resolves the prompt first and passes the text here. Direct callers must provide the resolved prompt string.
2. **Session lifecycle** — State transitions with Mermaid state diagram showing all valid transitions:
   - `active → paused` (via `pause()`)
   - `paused → active` (via `resume()`)
   - `active → ended` (via `end()`)
   - `paused → ended` (via `end()`)

   The `end()` method accepts any non-ended session. Methods: `pause(sessionId)`, `resume(sessionId)`, `end(sessionId)`.

3. **Retrieve messages** — `getMessages(sessionId, { page, perPage })` loads the session's `mastraThreadId`, delegates to Mastra memory.
4. **Export transcript** — `exportTranscript(sessionId, 'json' | 'text')` fetches all messages and formats them.
5. **Error handling** — `SessionNotFoundError`, `SessionAlreadyEndedError` with type guards.

#### docs/session/endpoints.md

Route table:

| Method | Path                          | Operation          | Request DTO                   | Response DTO                                                                                   |
| ------ | ----------------------------- | ------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET`  | `/ai/sessions`                | `list`             | `sessionListQueryDto` (query) | `sessionSummaryResponseDto[]`                                                                  |
| `GET`  | `/ai/sessions/:id`            | `get`              | —                             | `sessionResponseDto`                                                                           |
| `GET`  | `/ai/sessions/:id/messages`   | `getMessages`      | `paginationQueryDto` (query)  | `messageResponseDto[]` (stubbed — returns empty array pending Mastra mediator integration)     |
| `GET`  | `/ai/sessions/:id/transcript` | `exportTranscript` | `transcriptQueryDto` (query)  | `transcriptResponseDto` (stubbed — returns empty messages pending Mastra mediator integration) |
| `PUT`  | `/ai/sessions/:id/end`        | `end`              | —                             | 204                                                                                            |

### Conversation Domain

#### docs/conversation/setup.md

**Sections:**

1. **Monolith mode** — `ConversationAppModule.forMonolith({ middleware })` with `ConversationMiddlewareConfig` (3 operations: `create`, `sendMessage`, `streamMessage`). Plus `conversationClientMonolithProviders()`.
2. **Standalone mode** — `ConversationAppModule.forStandalone({ middleware, promptServiceUrl, sessionServiceUrl })`. Plus `conversationClientStandaloneProviders({ baseUrl, httpClientToken })`.
3. **Diagram** — Mermaid flowchart showing monolith vs standalone wiring.

#### docs/conversation/usage.md

**Sections:**

1. **Create a conversation** — `IConversationEngine.create(config)` with `ConversationConfig` fields explained. Orchestration sequence:
   - Resolve prompt via mediator (`ResolvePromptQuery`)
   - Create session via mediator (`CreateSessionCommand`)
   - Store internal `ConversationState` in an in-memory map (includes `mastraThreadId`, `userId` beyond what `Conversation` exposes)
   - Return `Conversation { id, sessionId, promptSlug, resolvedPrompt, model }`

2. **Send a message** — `send(conversationId, message)` returns `ConversationResponse { text, object? }`. Delegates to `IMastraAgent.generate()`.

3. **Stream a response** — `stream(conversationId, message)` returns `AsyncIterable<StreamChunk>`. Each chunk has `type: 'text-delta' | 'tool-call' | 'finish'` and `content: string`.

4. **Multi-instance reconstruction** — The conversation handle is in-memory. If a different instance receives a `send()` or `stream()` call, the engine reconstructs the handle: loads the session row, re-resolves the prompt, re-creates the agent config. No sticky sessions required.

   **Diagram:** Mermaid sequence diagram showing the create → send flow, including the reconstruction path.

5. **Error handling** — `ConversationNotFoundError`, `ConversationSendError` (wraps `MastraAdapterError`).

#### docs/conversation/endpoints.md

Route table:

| Method | Path                                    | Operation       | Request DTO             | Response DTO                |
| ------ | --------------------------------------- | --------------- | ----------------------- | --------------------------- |
| `POST` | `/ai/conversations`                     | `create`        | `createConversationDto` | `conversationResponseDto`   |
| `POST` | `/ai/conversations/:id/messages`        | `sendMessage`   | `sendMessageDto`        | `messageResponseDto`        |
| `POST` | `/ai/conversations/:id/messages/stream` | `streamMessage` | `sendMessageDto`        | SSE stream of `StreamChunk` |

---

## JSDoc Coverage

Add JSDoc to all public exports. Scope:

### Interfaces

| Interface                  | File                                                               | Coverage                                                       |
| -------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `IPromptService`           | `src/business/domain/prompt/prompt.interface.ts`                   | Class doc + all 8 methods with `@param`, `@returns`, `@throws` |
| `ISessionService`          | `src/business/domain/session/session.interface.ts`                 | Class doc + all 8 methods                                      |
| `IConversationEngine`      | `src/business/domain/conversation/conversation.interface.ts`       | Class doc + all 3 methods, usage example on `create()`         |
| `IMastraAgent`             | `src/business/sdk/mastra/mastra.interface.ts`                      | Class doc + `generate()`, `stream()`                           |
| `IMastraMemory`            | `src/business/sdk/mastra/mastra.interface.ts`                      | Class doc + `createThread()`, `getMessages()`, `listThreads()` |
| `IPromptRepository`        | `src/repository/domain/prompt/prompt.interface.ts`                 | Class doc + all 6 methods                                      |
| `IPromptVersionRepository` | `src/repository/domain/prompt-version/prompt-version.interface.ts` | Class doc + all 6 methods                                      |
| `ISessionRepository`       | `src/repository/domain/session/session.interface.ts`               | Class doc + all 4 methods                                      |

### Models

| Model                                                                                                               | File                                                     | Coverage                                                          |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `PromptTemplate`                                                                                                    | `src/business/domain/prompt/prompt.model.ts`             | Interface doc + field docs for `parameterSchema`, `activeVersion` |
| `PromptVersion`                                                                                                     | same                                                     | Interface doc                                                     |
| `ResolvedPrompt`                                                                                                    | same                                                     | Interface doc                                                     |
| `CreatePromptInput`, `UpdatePromptInput`, `CreateVersionInput`, `PromptFilter`                                      | same                                                     | Interface docs                                                    |
| `Session`, `SessionSummary`                                                                                         | `src/business/domain/session/session.model.ts`           | Interface doc + field doc for `mastraThreadId`                    |
| `StartSessionInput`, `SessionFilter`, `Transcript`                                                                  | same                                                     | Interface docs                                                    |
| `ConversationConfig`                                                                                                | `src/business/domain/conversation/conversation.model.ts` | Interface doc + field docs for `outputSchema`, `model`            |
| `Conversation`, `ConversationResponse`                                                                              | same                                                     | Interface docs                                                    |
| `AgentResponse`, `StreamChunk`, `GenerateOptions`, `Thread`, `Message`, `Pagination`, `MessageList`, `ThreadFilter` | `src/business/sdk/mastra/mastra.interface.ts`            | Interface docs                                                    |

### Error Classes

| Error                                              | File                                                           | Coverage                         |
| -------------------------------------------------- | -------------------------------------------------------------- | -------------------------------- |
| `PromptError` hierarchy (1 base + 5 subclasses)    | `src/business/domain/prompt/prompt.error.ts`                   | Class doc explaining when thrown |
| `SessionError` hierarchy (2 classes)               | `src/business/domain/session/session.error.ts`                 | Same                             |
| `ConversationError` hierarchy (2 classes)          | `src/business/domain/conversation/conversation.error.ts`       | Same                             |
| `MastraAdapterError`                               | `src/business/sdk/mastra/mastra.error.ts`                      | Same                             |
| `PromptRepositoryError` hierarchy (2 classes)      | `src/repository/domain/prompt/prompt.error.ts`                 | Same                             |
| `PromptVersionRepositoryError` hierarchy (1 class) | `src/repository/domain/prompt-version/prompt-version.error.ts` | Same                             |
| `SessionRepositoryError` hierarchy (1 class)       | `src/repository/domain/session/session.error.ts`               | Same                             |
| Client errors (3 hierarchies)                      | `src/business/domain/*/client/errors.ts`                       | Same                             |

### DI Tokens

| Token                                                                      | File                                          | Coverage                                  |
| -------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| `AI_DB`, `AI_CACHE`, `AI_MEDIATOR`                                         | `src/shared/tokens.ts`                        | Brief doc: what it provides, who binds it |
| `AI_CONFIG`                                                                | `src/config.ts`                               | Brief doc                                 |
| `PROMPT_SERVICE`, `SESSION_SERVICE`, `CONVERSATION_ENGINE`                 | respective interface files                    | Brief doc                                 |
| `MASTRA_AGENT`, `MASTRA_MEMORY`, `MASTRA_CORE_AGENT`, `MASTRA_CORE_MEMORY` | `src/business/sdk/mastra/mastra.interface.ts` | Brief doc                                 |
| `PROMPT_REPOSITORY`, `PROMPT_VERSION_REPOSITORY`, `SESSION_REPOSITORY`     | respective interface files                    | Brief doc                                 |

### Not Covered

- Private implementation methods
- DTO Zod schemas (self-describing from field names + Zod types)
- Test mock factories (used only in tests, pattern is obvious)
- Mapper functions (internal, not part of public API)
- Provider bundle functions (composition utilities, self-describing)

---

## README Update

Update the root `README.md`:

1. **Add Documentation section** after "What It Does" — table linking all 15 docs with one-line descriptions, grouped by Start Here / Features / Reference
2. **Trim Quick Start** — shorten to a teaser (install + 3-line code snippet), point to `docs/getting-started.md` for the full walkthrough
3. **Keep existing sections** — What It Does, Install, Architecture, REST Endpoints, Tech Stack, Development — but trim any content now covered by dedicated docs
4. **Remove duplicate endpoint tables** — replace with a link to the per-feature endpoint docs

---

## Diagrams

The following Mermaid diagrams appear in the docs:

| Diagram                     | Location                | Type             | Shows                                                                                                    |
| --------------------------- | ----------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Module dependency graph     | `integration.md`        | Flowchart        | How app modules, business providers, repo providers, mediator clients, and tokens connect                |
| Monolith vs standalone      | `customization.md`      | Flowchart        | Side-by-side: local mediator vs HTTP mediator wiring                                                     |
| Prompt module flow          | `prompt/setup.md`       | Flowchart        | PromptAppModule → Router → AppService → mediator → LocalMediator → PromptService → repos                 |
| Session lifecycle           | `session/usage.md`      | State diagram    | active ↔ paused, active → ended, paused → ended                                                          |
| Conversation create+send    | `conversation/usage.md` | Sequence diagram | Engine → mediator → PromptService (resolve) → mediator → SessionService (start) → MastraAgent (generate) |
| Conversation reconstruction | `conversation/usage.md` | Sequence diagram | Engine receives send() → handle missing → load session → re-resolve prompt → agent ready → generate      |

All diagrams use Mermaid v11 syntax, validated with `/mermaidjs-v11` and `/mermaid-diagrams` skills during implementation.

---

## Out of Scope

- **API docs generation** (TypeDoc) — JSDoc is enough for IDE consumption; generated HTML docs are a separate initiative
- **Changelog documentation** — covered by semantic-release
- **Architecture decision records** — the existing design spec serves this purpose
- **Migration guides** — no prior version to migrate from
