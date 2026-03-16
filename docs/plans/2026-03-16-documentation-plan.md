# AI Package Documentation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 15 documentation files, JSDoc on all public interfaces, and an updated README to `@sanamyvn/ai-ts`.

**Architecture:** Markdown docs in `docs/` following the iam-ts pattern. JSDoc added directly to source files. All prose written with `/writing-clearly-and-concisely` skill. All diagrams use `/mermaidjs-v11` and `/mermaid-diagrams` skills.

**Tech Stack:** Markdown, Mermaid v11, JSDoc/TSDoc, TypeScript

**Spec:** [2026-03-16-documentation-design.md](./2026-03-16-documentation-design.md)

---

## Skill Requirements

Every task that writes prose MUST use the `/writing-clearly-and-concisely` skill. Every task that includes a Mermaid diagram MUST use `/mermaidjs-v11` and `/mermaid-diagrams` skills. Every code example MUST be verified against the source at `/Users/maw/Workspace/sanamy/ai-ts/` and `/Users/maw/Workspace/sanamy/foundation/`.

## Import Reference

All code examples in docs use these verified import paths:

```typescript
// Shared
import { AI_DB, AI_CACHE, AI_MEDIATOR } from '@sanamyvn/ai-ts/shared/tokens';
import { AI_CONFIG, aiConfigSchema } from '@sanamyvn/ai-ts/config';
import type { AiConfig } from '@sanamyvn/ai-ts/config';

// Repository
import type { IPromptRepository } from '@sanamyvn/ai-ts/repository/prompt';
import type { IPromptVersionRepository } from '@sanamyvn/ai-ts/repository/prompt-version';
import type { ISessionRepository } from '@sanamyvn/ai-ts/repository/session';

// Business — Prompt
import type { IPromptService } from '@sanamyvn/ai-ts/business/prompt';
import type { PromptTemplate, ResolvedPrompt, CreatePromptInput } from '@sanamyvn/ai-ts/business/prompt/model';
import {
  PromptNotFoundError, PromptAlreadyExistsError, PromptVersionNotFoundError,
  InvalidPromptParametersError, PromptRenderError,
  isPromptNotFoundError, isPromptAlreadyExistsError,
} from '@sanamyvn/ai-ts/business/prompt/error';

// Business — Session
import type { ISessionService } from '@sanamyvn/ai-ts/business/session';
import type { Session, StartSessionInput } from '@sanamyvn/ai-ts/business/session/model';
import {
  SessionNotFoundError, SessionAlreadyEndedError,
  isSessionNotFoundError, isSessionAlreadyEndedError,
} from '@sanamyvn/ai-ts/business/session/error';

// Business — Conversation
import type { IConversationEngine } from '@sanamyvn/ai-ts/business/conversation';
import type { Conversation, ConversationConfig } from '@sanamyvn/ai-ts/business/conversation/model';
import { ConversationNotFoundError, ConversationSendError } from '@sanamyvn/ai-ts/business/conversation/error';

// Business — Mastra
import type { IMastraAgent, IMastraMemory } from '@sanamyvn/ai-ts/business/mastra';
import { MastraAdapterError } from '@sanamyvn/ai-ts/business/mastra/error';

// App modules
import { PromptAppModule } from '@sanamyvn/ai-ts/app/prompt/module';
import { SessionAppModule } from '@sanamyvn/ai-ts/app/session/module';
import { ConversationAppModule } from '@sanamyvn/ai-ts/app/conversation/module';

// Mediator clients — monolith
import { promptClientMonolithProviders } from '@sanamyvn/ai-ts/app/prompt-client/module';
import { sessionClientMonolithProviders } from '@sanamyvn/ai-ts/app/session-client/module';
import { conversationClientMonolithProviders } from '@sanamyvn/ai-ts/app/conversation-client/module';

// Mediator clients — standalone
import { promptClientStandaloneProviders } from '@sanamyvn/ai-ts/app/prompt-client/module';
import { sessionClientStandaloneProviders } from '@sanamyvn/ai-ts/app/session-client/module';
import { conversationClientStandaloneProviders } from '@sanamyvn/ai-ts/app/conversation-client/module';

// Testing
import { createMockPromptService } from '@sanamyvn/ai-ts/business/prompt/testing';
import { createMockSessionService } from '@sanamyvn/ai-ts/business/session/testing';
import { createMockConversationEngine } from '@sanamyvn/ai-ts/business/conversation/testing';
import { createMockMastraAgent, createMockMastraMemory } from '@sanamyvn/ai-ts/business/mastra/testing';
import { createMockPromptRepository } from '@sanamyvn/ai-ts/repository/prompt/testing';
import { createMockPromptVersionRepository } from '@sanamyvn/ai-ts/repository/prompt-version/testing';
import { createMockSessionRepository } from '@sanamyvn/ai-ts/repository/session/testing';

// Foundation
import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { Module } from '@sanamyvn/foundation/di/node/module';
```

---

## Chunk 1: Prerequisite Fix + Getting Started Guides

### Task 1: Fix prompt service mock typing

**Files:**
- Modify: `src/business/domain/prompt/prompt.testing.ts`

The prompt service mock uses untyped `vi.fn()`. Fix it to match the typed pattern used by all other mocks. Read `src/business/domain/session/session.testing.ts` first to confirm the exact pattern, then replicate it. Key change: remove the explicit `: IPromptService` return type annotation so TypeScript infers `Mock<T>` types instead.

- [ ] **Step 1: Update mock factory**

```typescript
// src/business/domain/prompt/prompt.testing.ts
import { vi } from 'vitest';
import type { IPromptService } from './prompt.interface.js';

export function createMockPromptService() {
  return {
    create: vi.fn<IPromptService['create']>(),
    getBySlug: vi.fn<IPromptService['getBySlug']>(),
    list: vi.fn<IPromptService['list']>(),
    update: vi.fn<IPromptService['update']>(),
    createVersion: vi.fn<IPromptService['createVersion']>(),
    listVersions: vi.fn<IPromptService['listVersions']>(),
    setActiveVersion: vi.fn<IPromptService['setActiveVersion']>(),
    resolve: vi.fn<IPromptService['resolve']>(),
  };
}
```

- [ ] **Step 2: Verify types and tests pass**

```bash
pnpm run check-types
pnpm vitest run --project unit
```

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/prompt/prompt.testing.ts
git commit -m "fix: type prompt service mock factory for TypeScript compatibility"
```

---

### Task 2: Getting started guide

**Files:**
- Create: `docs/getting-started.md`

- [ ] **Step 1: Write getting-started.md**

Use `/writing-clearly-and-concisely` skill. All code examples MUST use the verified import paths from the Import Reference section at the top of this plan. Read the actual source files to verify API signatures before writing examples. Structure:

```markdown
# Getting Started

## Install

pnpm add @sanamyvn/ai-ts
# Peer dependencies
pnpm add @sanamyvn/foundation @mastra/core drizzle-orm zod

## Provide Infrastructure Tokens

[Code example: bind AI_DB via alias or PostgresModule, bind MASTRA_CORE_AGENT and MASTRA_CORE_MEMORY via value()]

## Register Modules

[Code example: Module class with imports array containing PromptAppModule.forRoot(), SessionAppModule.forRoot(), ConversationAppModule.forMonolith(), plus three *ClientMonolithProviders()]

## Create a Prompt

[Code example: promptService.create() + promptService.createVersion() with activate: true]

## Start a Conversation

[Code example: conversationEngine.create() with ConversationConfig, then conversationEngine.send()]
```

All code examples must use the verified import paths from the Import Reference section above.

- [ ] **Step 2: Verify all import paths exist in package.json exports**

```bash
grep -c "getting-started" docs/getting-started.md  # sanity check file exists
```

- [ ] **Step 3: Commit**

```bash
git add docs/getting-started.md
git commit -m "docs: add getting started guide"
```

---

### Task 3: Integration guide

**Files:**
- Create: `docs/integration.md`

- [ ] **Step 1: Write integration.md**

Use `/writing-clearly-and-concisely` skill. Use `/mermaidjs-v11` and `/mermaid-diagrams` for the module dependency graph. All code examples MUST use the verified import paths from the Import Reference section at the top of this plan. Read the actual source files to verify API signatures before writing examples. Structure:

```markdown
# Integration Guide

## Project Structure

[Show typical src/ layout with AI module imports alongside app modules]

## Database Setup

[Two options: alias(AI_DB, APP_DB) or separate PostgresModule.forRoot().
Show Drizzle schema imports: aiPrompts, aiPromptVersions, aiSessions from repository schema exports.
Note: include these in your Drizzle migration config.]

## Mastra Setup

[Code example: value(MASTRA_CORE_AGENT, myAgent), value(MASTRA_CORE_MEMORY, myMemory).
Explain: adapters wrap these automatically via DI — no direct import of MastraAgentAdapter needed.]

## Module Registration

[Full Module class example with all three app modules + middleware config.
Show PromptAppModule.forRoot({ middleware: { create: [...], list: [...], ... } }).
Show SessionAppModule.forRoot({ middleware: { ... } }).
Show ConversationAppModule.forMonolith({ middleware: { ... } }).]

## Mediator Client Wiring

[Code example: three *ClientMonolithProviders() in the imports array.
Explain: these register the in-process mediator adapters so cross-domain calls work.]

## Module Dependency Graph

[Mermaid flowchart showing:
- App modules → business providers → repo providers
- Mediator clients connecting domains
- Infrastructure tokens (AI_DB, MASTRA_CORE_AGENT, etc.) provided by downstream]
```

The Mermaid diagram should be a `flowchart TB` showing the module hierarchy.

- [ ] **Step 2: Verify all import paths in code examples exist in package.json exports**

- [ ] **Step 3: Commit**

```bash
git add docs/integration.md
git commit -m "docs: add integration guide with module dependency diagram"
```

---

## Chunk 2: Reference Guides

### Task 4: Configuration reference

**Files:**
- Create: `docs/configuration.md`

- [ ] **Step 1: Write configuration.md**

Use `/writing-clearly-and-concisely` skill. Structure:

```markdown
# Configuration

The `aiConfigSchema` defines runtime settings. Parse it and bind to `AI_CONFIG`.

## Schema Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultModel` | `string` | `'anthropic/claude-sonnet-4-20250514'` | Model identifier passed to Mastra agent |
| `prompt.maxVersions` | `number` | `50` | Maximum versions per prompt template |
| `session.transcriptPageSize` | `number` | `100` | Messages per page in transcript export |

## Providing Config

[Code example: import { AI_CONFIG, aiConfigSchema } from '@sanamyvn/ai-ts/config';
value(AI_CONFIG, aiConfigSchema.parse({ defaultModel: 'openai/gpt-4o' }))
Note: parse() applies defaults for omitted fields.]

## Types

[Show AiConfig and AiConfigInput type exports]
```

- [ ] **Step 2: Commit**

```bash
git add docs/configuration.md
git commit -m "docs: add configuration reference"
```

---

### Task 5: Customization guide

**Files:**
- Create: `docs/customization.md`

- [ ] **Step 1: Write customization.md**

Use `/writing-clearly-and-concisely` skill. Use `/mermaidjs-v11` and `/mermaid-diagrams` for the deployment modes diagram. Structure:

```markdown
# Customization

## Deployment Modes

[Mermaid diagram: two flowcharts side by side.
Left: Monolith — AppModule → LocalMediator → PromptService (in-process).
Right: Standalone — AppModule → RemoteMediator → HTTP → PromptService (separate process).]

### Monolith (default)
[Code: *ClientMonolithProviders()]

### Standalone
[Code: *ClientStandaloneProviders({ baseUrl, httpClientToken })]

[Explain: zero changes in business code — only module composition changes.]

## Custom Middleware

[List all three MiddlewareConfig types with their operations.
Show two examples: iam-ts auth and Supabase auth.]

## Custom Repositories

[Explain: implement IPromptRepository / IPromptVersionRepository / ISessionRepository.
Bind your implementation to the token.
Code example: bind(PROMPT_REPOSITORY, MyCustomPromptRepo)]

## Custom Mastra Integration

[Explain: implement IMastraAgent or IMastraMemory directly.
Bind to MASTRA_AGENT / MASTRA_MEMORY.
Use case: custom agent with tools, or alternative memory backend.]
```

- [ ] **Step 2: Commit**

```bash
git add docs/customization.md
git commit -m "docs: add customization guide with deployment mode diagrams"
```

---

### Task 6: Testing guide

**Files:**
- Create: `docs/testing.md`

- [ ] **Step 1: Write testing.md**

Use `/writing-clearly-and-concisely` skill. Structure:

```markdown
# Testing

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

All mocks use typed `vi.fn<Interface['method']>()`, so `.mockResolvedValue()` works with TypeScript.

## Unit Test Pattern

[Code example: test file that imports createMockConversationEngine,
sets up mockResolvedValue, calls the function under test, asserts result.
Show the full test with describe/it/expect.]

## Integration Tests

The package uses foundation's `createPostgresFixture()` for integration tests.
See foundation testing docs for the fixture API.

[Show the internal pattern (createAiTestContext) as a reference.
Note: this helper is internal. Downstream apps build their own test contexts
using the exported mock factories above.]

[Code example: typical beforeAll/afterAll/beforeEach/afterEach structure.]
```

- [ ] **Step 2: Commit**

```bash
git add docs/testing.md
git commit -m "docs: add testing guide with mock factories and patterns"
```

---

## Chunk 3: Prompt Feature Docs

### Task 7: Prompt setup

**Files:**
- Create: `docs/prompt/setup.md`

- [ ] **Step 1: Write prompt/setup.md**

Use `/writing-clearly-and-concisely` skill. Use `/mermaidjs-v11` and `/mermaid-diagrams` for the module flow diagram. Structure:

```markdown
# Prompt — Setup

## App Module

[Code: PromptAppModule.forRoot({ middleware: PromptMiddlewareConfig })
Show all 7 middleware operations: create, list, getBySlug, update, createVersion, activateVersion, listVersions]

## Mediator Client

### Monolith
[Code: promptClientMonolithProviders()]

### Standalone
[Code: promptClientStandaloneProviders({ baseUrl, httpClientToken })]

## Required Tokens

| Token | Type | Who Provides |
|-------|------|-------------|
| `AI_DB` | `PostgresClient<AiSchema>` | Downstream app |
| `AI_CONFIG` | `AiConfig` | Downstream app |
| `PROMPT_REPOSITORY` | `IPromptRepository` | Auto-bound by repo providers |
| `PROMPT_VERSION_REPOSITORY` | `IPromptVersionRepository` | Auto-bound by repo providers |

## Module Flow

[Mermaid flowchart: PromptAppModule → PromptRouter → PromptAppService → IMediator → PromptLocalMediator → PromptService → IPromptRepository + IPromptVersionRepository]
```

- [ ] **Step 2: Commit**

```bash
git add docs/prompt/setup.md
git commit -m "docs: add prompt setup guide"
```

---

### Task 8: Prompt usage

**Files:**
- Create: `docs/prompt/usage.md`

- [ ] **Step 1: Write prompt/usage.md**

Use `/writing-clearly-and-concisely` skill. Structure:

```markdown
# Prompt — Usage

## Create a Prompt Template

[Code: promptService.create({ name, slug, parameterSchema, metadata }).
Explain parameterSchema format: { "topic": { "type": "string" }, "count": { "type": "number", "min": 1, "max": 10 } }]

## Manage Versions

[Code: promptService.createVersion(promptId, { template: 'Hello {{name}}', activate: true }).
Explain: one active version per prompt. Version numbers auto-increment.
Code: promptService.listVersions(promptId).
Code: promptService.setActiveVersion(promptId, versionId).]

## Resolve a Template

[Code: promptService.resolve('my-prompt', { name: 'World' }).
Returns ResolvedPrompt { slug, version, text }.
Explain: finds active version, validates params against parameterSchema, renders with Mustache.]

## Error Handling

| Error | When | Type Guard |
|-------|------|------------|
| `PromptNotFoundError` | Slug not found or no active version | `isPromptNotFoundError()` |
| `PromptAlreadyExistsError` | Duplicate slug on create | `isPromptAlreadyExistsError()` |
| `PromptVersionNotFoundError` | Version ID not found during setActive | — |
| `InvalidPromptParametersError` | Params fail schema validation | — |
| `PromptRenderError` | Mustache rendering fails | — |

All errors extend `PromptError`. Import from `@sanamyvn/ai-ts/business/prompt/error`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/prompt/usage.md
git commit -m "docs: add prompt usage guide"
```

---

### Task 9: Prompt endpoints

**Files:**
- Create: `docs/prompt/endpoints.md`

- [ ] **Step 1: Write prompt/endpoints.md**

Use `/writing-clearly-and-concisely` skill. Structure:

```markdown
# Prompt — Endpoints

Base path: `/ai/prompts`

| Method | Path | Operation | Request | Response |
|--------|------|-----------|---------|----------|
| `POST` | `/ai/prompts` | `create` | `createPromptDto` (body) | `promptResponseDto` |
| `GET` | `/ai/prompts` | `list` | `promptListQueryDto` (query) | `promptResponseDto[]` |
| `GET` | `/ai/prompts/:slug` | `getBySlug` | — | `promptResponseDto` |
| `PUT` | `/ai/prompts/:slug` | `update` | `updatePromptDto` (body) | `promptResponseDto` |
| `POST` | `/ai/prompts/:slug/versions` | `createVersion` | `createVersionDto` (body) | `promptResponseDto` |
| `PUT` | `/ai/prompts/:slug/versions/:id/activate` | `activateVersion` | — | 204 No Content |
| `GET` | `/ai/prompts/:slug/versions` | `listVersions` | — | `promptResponseDto` |

**Operation names** match the keys in `PromptMiddlewareConfig`, so you can cross-reference which middleware applies to which route.

**DTO types** are internal to the router. For exact shapes, see the Zod schemas in `src/app/domain/prompt/prompt.dto.ts`.

**Note:** `listVersions` returns the prompt with its active version embedded — not a separate version list. The router calls `getBySlug` internally.
```

- [ ] **Step 2: Commit**

```bash
git add docs/prompt/endpoints.md
git commit -m "docs: add prompt endpoint reference"
```

---

## Chunk 4: Session + Conversation Feature Docs

### Task 10: Session docs (setup + usage + endpoints)

**Files:**
- Create: `docs/session/setup.md`
- Create: `docs/session/usage.md`
- Create: `docs/session/endpoints.md`

- [ ] **Step 1: Write session/setup.md**

Use `/writing-clearly-and-concisely` skill. Same structure as prompt/setup.md:
- `SessionAppModule.forRoot({ middleware: SessionMiddlewareConfig })` with 5 operations: `list`, `get`, `getMessages`, `exportTranscript`, `end`
- Mediator client: `sessionClientMonolithProviders()` / `sessionClientStandaloneProviders()`
- Required tokens table

- [ ] **Step 2: Write session/usage.md**

Use `/writing-clearly-and-concisely` skill. Use `/mermaidjs-v11` and `/mermaid-diagrams` for the state diagram. Structure:

```markdown
# Session — Usage

## Start a Session

[Code: sessionService.start({ userId, promptSlug, resolvedPrompt, purpose }).
Explain: resolvedPrompt is required — the conversation engine resolves it automatically,
but direct callers must provide the rendered prompt string.
Explain: creates a Mastra thread + ai_sessions row linked via mastraThreadId.]

## Session Lifecycle

[Mermaid state diagram:
stateDiagram-v2
  [*] --> active
  active --> paused : pause()
  paused --> active : resume()
  active --> ended : end()
  paused --> ended : end()
  ended --> [*]
]

Code examples for each transition:
- `sessionService.pause(sessionId)` — pauses an active session
- `sessionService.resume(sessionId)` — resumes a paused session, returns updated `Session`
- `sessionService.end(sessionId)` — ends any non-ended session, sets `endedAt`

## Retrieve Messages

[Code: sessionService.getMessages(sessionId, { page: 1, perPage: 20 }).
Explain: loads mastraThreadId from session, delegates to Mastra memory.]

## Export Transcript

[Code: sessionService.exportTranscript(sessionId, 'json').
Explain: fetches all messages, formats as JSON or plain text.]

## Error Handling

| Error | When | Type Guard |
|-------|------|------------|
| `SessionNotFoundError` | Session ID not found | `isSessionNotFoundError()` |
| `SessionAlreadyEndedError` | Trying to pause/resume/end an ended session | `isSessionAlreadyEndedError()` |
```

- [ ] **Step 3: Write session/endpoints.md**

Use `/writing-clearly-and-concisely` skill. Full route table:

```markdown
# Session — Endpoints

Base path: `/ai/sessions`

| Method | Path | Operation | Request | Response |
|--------|------|-----------|---------|----------|
| `GET` | `/ai/sessions` | `list` | `sessionListQueryDto` (query) | `sessionSummaryResponseDto[]` |
| `GET` | `/ai/sessions/:id` | `get` | — | `sessionResponseDto` |
| `GET` | `/ai/sessions/:id/messages` | `getMessages` | `paginationQueryDto` (query) | `messageResponseDto[]` |
| `GET` | `/ai/sessions/:id/transcript` | `exportTranscript` | `transcriptQueryDto` (query) | `transcriptResponseDto` |
| `PUT` | `/ai/sessions/:id/end` | `end` | — | 204 No Content |

**Operation names** match the keys in `SessionMiddlewareConfig`.

**DTO types** are internal. For exact shapes, see `src/app/domain/session/session.dto.ts`.

> **Note:** `getMessages` and `exportTranscript` are stubbed at the app layer — they return empty results pending Mastra mediator integration. The business-layer `ISessionService` methods work correctly when called directly.
```

- [ ] **Step 4: Commit**

```bash
git add docs/session/
git commit -m "docs: add session setup, usage, and endpoint guides"
```

---

### Task 11: Conversation docs (setup + usage + endpoints)

**Files:**
- Create: `docs/conversation/setup.md`
- Create: `docs/conversation/usage.md`
- Create: `docs/conversation/endpoints.md`

- [ ] **Step 1: Write conversation/setup.md**

Use `/writing-clearly-and-concisely` skill. Use `/mermaidjs-v11` and `/mermaid-diagrams` for monolith vs standalone diagram. Structure:

```markdown
# Conversation — Setup

## Monolith Mode

[Code: ConversationAppModule.forMonolith({ middleware: { create, sendMessage, streamMessage } })
Plus: conversationClientMonolithProviders()]

## Standalone Mode

[Code: ConversationAppModule.forStandalone({
  middleware: { ... },
  promptServiceUrl: 'https://prompt.internal',
  sessionServiceUrl: 'https://session.internal',
})
Plus: conversationClientStandaloneProviders({ baseUrl, httpClientToken })]

## Deployment Comparison

[Mermaid flowchart showing monolith vs standalone side by side:
Monolith: ConversationEngine → IMediator → PromptLocalMediator → PromptService (same process)
Standalone: ConversationEngine → IMediator → PromptRemoteMediator → HTTP → Prompt Service (remote)]
```

- [ ] **Step 2: Write conversation/usage.md**

Use `/writing-clearly-and-concisely` skill. Use `/mermaidjs-v11` and `/mermaid-diagrams` for sequence diagrams. Structure:

```markdown
# Conversation — Usage

## Create a Conversation

[Code: conversationEngine.create({
  promptSlug: 'ielts-speaking-examiner',
  promptParams: { part: 2, topic: 'describe a place' },
  userId: 'student-1',
  purpose: 'ielts-speaking',
}).
Explain ConversationConfig fields. Note: outputSchema for structured output (quiz JSON, rubrics).]

### Orchestration Flow

[Mermaid sequence diagram:
ConversationEngine -> IMediator : ResolvePromptQuery(slug, params)
IMediator -> PromptService : resolve()
PromptService --> IMediator : ResolvedPrompt
IMediator --> ConversationEngine : ResolvedPrompt
ConversationEngine -> IMediator : CreateSessionCommand(userId, purpose, promptSlug)
IMediator -> SessionService : start()
SessionService --> IMediator : Session
IMediator --> ConversationEngine : Session
Note over ConversationEngine : Store ConversationState in map
ConversationEngine --> Caller : Conversation { id, sessionId, promptSlug, resolvedPrompt, model }]

## Send a Message

[Code: conversationEngine.send(conversation.id, 'Help me with Part 2').
Returns ConversationResponse { text, object? }.]

## Stream a Response

[Code: for await (const chunk of conversationEngine.stream(conversation.id, 'Begin the test')) {
  // chunk.type: 'text-delta' | 'tool-call' | 'finish'
  // chunk.content: string
}]

## Multi-Instance Reconstruction

[Explain: ConversationState is in-memory. When a different instance receives send()/stream(),
the engine reconstructs: load session → re-resolve prompt → rebuild state. No sticky sessions.]

[Mermaid sequence diagram showing reconstruction:
Caller -> ConversationEngine : send(conversationId, message)
Note over ConversationEngine : Handle not in map
ConversationEngine -> IMediator : FindSessionByIdQuery(sessionId)
IMediator -> SessionService : get()
SessionService --> ConversationEngine : Session { promptSlug, mastraThreadId }
ConversationEngine -> IMediator : ResolvePromptQuery(slug, {})
IMediator -> PromptService : resolve()
PromptService --> ConversationEngine : ResolvedPrompt
Note over ConversationEngine : Rebuild ConversationState
ConversationEngine -> IMastraAgent : generate(message, { threadId })
IMastraAgent --> ConversationEngine : AgentResponse
ConversationEngine --> Caller : ConversationResponse]

## Error Handling

| Error | When | Type Guard |
|-------|------|------------|
| `ConversationNotFoundError` | Session lookup fails during reconstruction | `isConversationNotFoundError()` |
| `ConversationSendError` | Mastra agent fails (wraps `MastraAdapterError`) | `isConversationSendError()` |
```

- [ ] **Step 3: Write conversation/endpoints.md**

Use `/writing-clearly-and-concisely` skill. Full route table:

```markdown
# Conversation — Endpoints

Base path: `/ai/conversations`

| Method | Path | Operation | Request | Response |
|--------|------|-----------|---------|----------|
| `POST` | `/ai/conversations` | `create` | `createConversationDto` (body) | `conversationResponseDto` |
| `POST` | `/ai/conversations/:id/messages` | `sendMessage` | `sendMessageDto` (body) | `messageResponseDto` |
| `POST` | `/ai/conversations/:id/messages/stream` | `streamMessage` | `sendMessageDto` (body) | SSE stream of `StreamChunk` |

**Operation names** match the keys in `ConversationMiddlewareConfig`.

**DTO types** are internal. For exact shapes, see `src/app/domain/conversation/conversation.dto.ts`.

> **Note:** The `streamMessage` endpoint currently uses the same handler as `sendMessage`. SSE streaming is the intended behavior but not yet implemented at the app layer. The business-layer `IConversationEngine.stream()` method works correctly.
```

- [ ] **Step 4: Commit**

```bash
git add docs/conversation/
git commit -m "docs: add conversation setup, usage, and endpoint guides"
```

---

## Chunk 5: JSDoc

### Task 12: JSDoc — Repository layer

**Files:**
- Modify: `src/repository/domain/prompt/prompt.interface.ts`
- Modify: `src/repository/domain/prompt/prompt.error.ts`
- Modify: `src/repository/domain/prompt-version/prompt-version.interface.ts`
- Modify: `src/repository/domain/prompt-version/prompt-version.error.ts`
- Modify: `src/repository/domain/session/session.interface.ts`
- Modify: `src/repository/domain/session/session.error.ts`

- [ ] **Step 1: Add JSDoc to IPromptRepository**

Read `src/repository/domain/prompt/prompt.interface.ts`. Add:
- Interface-level doc: "Stores and retrieves prompt templates from the database."
- Method docs with `@param`, `@returns` for all 6 methods
- `@throws` where applicable (e.g., `update` throws `PromptNotFoundRepoError`)

- [ ] **Step 2: Add JSDoc to prompt repo errors**

Read `src/repository/domain/prompt/prompt.error.ts`. Add class-level doc to each error explaining when it is thrown.

- [ ] **Step 3: Add JSDoc to IPromptVersionRepository + errors**

Read `src/repository/domain/prompt-version/prompt-version.interface.ts`. Add interface doc and method docs for all 6 methods: `create`, `findById`, `findActiveByPromptId`, `listByPromptId`, `setActive`, `getNextVersion`. Add JSDoc to the `PROMPT_VERSION_REPOSITORY` token.

Read `src/repository/domain/prompt-version/prompt-version.error.ts`. The base class already has JSDoc. Add class-level doc to `PromptVersionNotFoundRepoError` explaining when it is thrown.

- [ ] **Step 4: Add JSDoc to ISessionRepository + errors**

Read `src/repository/domain/session/session.interface.ts`. Add interface doc and method docs for all 4 methods: `create`, `findById`, `list`, `updateStatus`. Add doc to the `SessionRepoFilter` interface. Add JSDoc to the `SESSION_REPOSITORY` token.

Read `src/repository/domain/session/session.error.ts`. The base class already has JSDoc. Add class-level doc to `SessionNotFoundRepoError`.

- [ ] **Step 5: Verify types pass**

```bash
pnpm run check-types
```

- [ ] **Step 6: Commit**

```bash
git add src/repository/
git commit -m "docs: add JSDoc to repository interfaces and errors"
```

---

### Task 13: JSDoc — Business layer (prompt, session, conversation)

**Files:**
- Modify: `src/business/domain/prompt/prompt.interface.ts`
- Modify: `src/business/domain/prompt/prompt.model.ts`
- Modify: `src/business/domain/prompt/prompt.error.ts`
- Modify: `src/business/domain/session/session.interface.ts`
- Modify: `src/business/domain/session/session.model.ts`
- Modify: `src/business/domain/session/session.error.ts`
- Modify: `src/business/domain/conversation/conversation.interface.ts`
- Modify: `src/business/domain/conversation/conversation.model.ts`
- Modify: `src/business/domain/conversation/conversation.error.ts`

- [ ] **Step 1: Add JSDoc to IPromptService**

Read `src/business/domain/prompt/prompt.interface.ts`. Add:
- Interface-level doc: "Manages versioned prompt templates with Mustache rendering."
- All 8 methods with `@param`, `@returns`, `@throws`
- Usage example on `resolve()` method

- [ ] **Step 2: Add JSDoc to prompt models**

Read `src/business/domain/prompt/prompt.model.ts`. Add interface docs. Field docs for `parameterSchema` (JSON key-type map) and `activeVersion` (present only when loaded).

- [ ] **Step 3: Add JSDoc to prompt errors**

Read `src/business/domain/prompt/prompt.error.ts`. The base class (`PromptError`) already has JSDoc. Add class-level docs to the 5 subclasses: `PromptNotFoundError`, `PromptAlreadyExistsError`, `PromptVersionNotFoundError`, `InvalidPromptParametersError`, `PromptRenderError`. Each doc explains when the error is thrown. Add JSDoc to the `PROMPT_SERVICE` token in `prompt.interface.ts`.

- [ ] **Step 4: Add JSDoc to session interface, models, errors**

Read `src/business/domain/session/session.interface.ts`. Add interface doc for `ISessionService` and method docs for all 8 methods: `start`, `pause`, `resume`, `end`, `get`, `list`, `getMessages`, `exportTranscript`. Add JSDoc to the `SESSION_SERVICE` token.

Read `src/business/domain/session/session.model.ts`. Add interface docs for `Session` (field doc for `mastraThreadId`, `resolvedPrompt`), `SessionSummary`, `StartSessionInput` (note `resolvedPrompt` is required), `SessionFilter`, `Transcript`.

Read `src/business/domain/session/session.error.ts`. Base class already has JSDoc. Add class-level docs to `SessionNotFoundError` and `SessionAlreadyEndedError`.

- [ ] **Step 5: Add JSDoc to conversation interface, models, errors**

Read `src/business/domain/conversation/conversation.interface.ts`. Add interface doc for `IConversationEngine` and method docs for all 3 methods. Add `@example` on `create()` showing typical `ConversationConfig`. Add JSDoc to the `CONVERSATION_ENGINE` token.

Read `src/business/domain/conversation/conversation.model.ts`. Add interface docs for `ConversationConfig` (field docs for `outputSchema` and `model`), `Conversation`, `ConversationResponse`.

Read `src/business/domain/conversation/conversation.error.ts`. Base class already has JSDoc. Add class-level docs to `ConversationNotFoundError` and `ConversationSendError`.

- [ ] **Step 6: Verify types pass**

```bash
pnpm run check-types
```

- [ ] **Step 7: Commit**

```bash
git add src/business/domain/
git commit -m "docs: add JSDoc to business interfaces, models, and errors"
```

---

### Task 14: JSDoc — Mastra interfaces, shared tokens, config

**Files:**
- Modify: `src/business/sdk/mastra/mastra.interface.ts`
- Modify: `src/business/sdk/mastra/mastra.error.ts`
- Modify: `src/shared/tokens.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Add JSDoc to IMastraAgent and IMastraMemory**

Read `src/business/sdk/mastra/mastra.interface.ts`. Add:
- Interface docs for `IMastraAgent`, `IMastraMemory`
- Method docs with `@param`, `@returns`, `@throws`
- Interface docs for all model types: `AgentResponse`, `StreamChunk`, `GenerateOptions`, `Thread`, `Message`, `Pagination`, `MessageList`, `ThreadFilter`
- Token docs for `MASTRA_AGENT`, `MASTRA_MEMORY`, `MASTRA_CORE_AGENT`, `MASTRA_CORE_MEMORY` — what each provides and who binds it

- [ ] **Step 2: Add JSDoc to MastraAdapterError**

- [ ] **Step 3: Add JSDoc to shared tokens**

Read `src/shared/tokens.ts`. Add doc to `AI_DB` ("Drizzle database client — provided by downstream app"), `AI_CACHE`, `AI_MEDIATOR`.

- [ ] **Step 4: Add JSDoc to config**

Read `src/config.ts`. Add doc to `aiConfigSchema`, `AI_CONFIG`.

- [ ] **Step 5: Add JSDoc to client errors (all 3 domains)**

Read `src/business/domain/prompt/client/errors.ts`, `src/business/domain/session/client/errors.ts`, `src/business/domain/conversation/client/errors.ts`. Add class-level docs.

- [ ] **Step 6: Verify types and lint pass**

```bash
pnpm run check-types
pnpm run lint
```

- [ ] **Step 7: Commit**

```bash
git add src/business/sdk/mastra/ src/shared/tokens.ts src/config.ts src/business/domain/*/client/errors.ts
git commit -m "docs: add JSDoc to Mastra interfaces, shared tokens, config, and client errors"
```

---

## Chunk 6: Index + README Update + Final Verification

### Task 15: Docs index

**Files:**
- Create: `docs/README.md`

- [ ] **Step 1: Write docs/README.md**

Use `/writing-clearly-and-concisely` skill. Structure:

```markdown
# @sanamyvn/ai-ts Documentation

## Start Here

| Guide | Description |
|-------|-------------|
| [Getting Started](./getting-started.md) | Install, wire modules, create your first conversation |
| [Integration Guide](./integration.md) | Full app wiring with database, Mastra, and middleware |

## Features

### Prompt — Versioned Template Registry

| Guide | Description |
|-------|-------------|
| [Setup](./prompt/setup.md) | Module wiring and middleware config |
| [Usage](./prompt/usage.md) | Create, version, and resolve templates |
| [Endpoints](./prompt/endpoints.md) | REST API reference |

### Session — Lifecycle Management

| Guide | Description |
|-------|-------------|
| [Setup](./session/setup.md) | Module wiring and middleware config |
| [Usage](./session/usage.md) | Start, pause, resume, end sessions |
| [Endpoints](./session/endpoints.md) | REST API reference |

### Conversation — AI Orchestration Engine

| Guide | Description |
|-------|-------------|
| [Setup](./conversation/setup.md) | Monolith and standalone deployment |
| [Usage](./conversation/usage.md) | Create conversations, send messages, stream responses |
| [Endpoints](./conversation/endpoints.md) | REST API reference |

## Reference

| Guide | Description |
|-------|-------------|
| [Configuration](./configuration.md) | Config schema fields and defaults |
| [Customization](./customization.md) | Deployment modes, custom middleware, swap implementations |
| [Testing](./testing.md) | Mock factories, unit patterns, integration setup |
```

- [ ] **Step 2: Commit**

```bash
git add docs/README.md
git commit -m "docs: add documentation index"
```

---

### Task 16: Update root README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README.md**

- [ ] **Step 2: Update README**

Use `/writing-clearly-and-concisely` skill. Changes:
- Add **Documentation** section after "What It Does" linking to `docs/README.md` and listing the guide categories
- Trim **Quick Start** to a teaser: install command + 5-line code snippet, then "See [Getting Started](docs/getting-started.md) for the full walkthrough"
- Replace endpoint tables with links to `docs/prompt/endpoints.md`, `docs/session/endpoints.md`, `docs/conversation/endpoints.md`
- Keep: What It Does, Install, Architecture, Tech Stack, Development sections

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with documentation links and trimmed content"
```

---

### Task 17: Final verification

- [ ] **Step 1: Verify all links in docs/**

Check that every `[link](./path)` in the docs points to a file that exists.

- [ ] **Step 2: Verify types and lint**

```bash
pnpm run check-types
pnpm run lint
pnpm vitest run --project unit
```

- [ ] **Step 3: Verify build**

```bash
pnpm run build
```

- [ ] **Step 4: Commit if needed**

```bash
git add -A
git commit -m "docs: final verification — all docs complete, links valid"
```
