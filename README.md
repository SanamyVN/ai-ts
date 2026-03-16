# @sanamyvn/ai-ts

Shared AI primitives — prompt registry, conversation engine, session lifecycle.

## What It Does

- **Prompt registry** — versioned, parameterized system prompt templates stored in the database, rendered with Mustache at resolve time
- **Conversation engine** — orchestrates prompt resolution, session creation, and Mastra agent communication; reconstructs state across instances without sticky sessions
- **Session lifecycle** — tracks who started a conversation, why, and when, linking business context to Mastra's thread storage
- **3-layer architecture** — repository → business → app, with cross-domain communication via the mediator pattern
- **Deployment flexibility** — each domain has local and remote mediator adapters; swap `forMonolith()` to `forStandalone()` with zero code changes in the business layer

## Install

```bash
pnpm add @sanamyvn/ai-ts
```

Peer dependencies:

```bash
pnpm add @sanamyvn/foundation   # ^1.12.0
pnpm add @mastra/core           # ^1.0.0
pnpm add drizzle-orm            # >=0.45.1
pnpm add zod                    # ^4.0.0
```

## Quick Start

```typescript
import { Module } from '@sanamyvn/foundation/di/node/module';
import { aiRepoProviders } from '@sanamyvn/ai-ts/repository/providers';
import { aiBusinessProviders } from '@sanamyvn/ai-ts/business/providers';
import { aiAppProviders } from '@sanamyvn/ai-ts/app/providers';
import { PromptAppModule } from '@sanamyvn/ai-ts/app/prompt/module';
import { SessionAppModule } from '@sanamyvn/ai-ts/app/session/module';
import { ConversationAppModule } from '@sanamyvn/ai-ts/app/conversation/module';

// Wire the AI package into your app
class AppModule extends Module {
  imports = [
    PromptAppModule.forRoot({
      middleware: {
        create: [AuthMiddleware, RoleMiddleware.require('admin')],
        list: [AuthMiddleware],
        getBySlug: [AuthMiddleware],
      },
    }),
    SessionAppModule.forRoot({
      middleware: {
        list: [AuthMiddleware],
        get: [AuthMiddleware],
        end: [AuthMiddleware, SessionOwnerMiddleware],
      },
    }),
    ConversationAppModule.forMonolith({
      middleware: {
        create: [AuthMiddleware],
        sendMessage: [AuthMiddleware],
        streamMessage: [AuthMiddleware],
      },
    }),
  ];
}
```

Use the conversation engine:

```typescript
// Quiz generation with structured output
const convo = await conversationEngine.create({
  promptSlug: 'quiz-generator',
  promptParams: { topic: 'photosynthesis', difficulty: 'intermediate' },
  userId: teacherId,
  purpose: 'quiz-gen',
});
const response = await conversationEngine.send(convo.id, 'Generate the quiz');

// IELTS speaking practice
const convo = await conversationEngine.create({
  promptSlug: 'ielts-speaking-examiner',
  promptParams: { part: 2, topic: 'describe a place you visited' },
  userId: studentId,
  purpose: 'ielts-speaking',
});
```

## Architecture

```
src/
├── shared/           # DI tokens, schema, config
├── repository/       # Drizzle schemas and queries (ai_prompts, ai_prompt_versions, ai_sessions)
├── business/
│   ├── sdk/mastra/   # Mastra adapter (Agent + Memory behind stable interfaces)
│   └── domain/       # Prompt service, session service, conversation engine
├── app/
│   ├── domain/       # REST routers with per-route middleware config
│   └── sdk/          # Local/remote mediator clients for each domain
└── __tests__/        # Integration tests against real Postgres
```

The package wraps [Mastra](https://mastra.ai) for the common pattern (persona + context + converse) and stays out of the way for advanced use cases (voice, RAG, evals) — downstream uses Mastra directly for those.

## REST Endpoints

**Prompts** (`/ai/prompts`) — create, list, get, update, version management, activate version

**Sessions** (`/ai/sessions`) — list, get, messages, transcript export, end

**Conversations** (`/ai/conversations`) — create, send message, stream message

## Tech Stack

- **TypeScript 5.9** with strict config
- **Zod 4** — validation and config schemas
- **Mastra** — AI runtime (model routing, thread storage, voice, RAG)
- **Mustache** — prompt template rendering
- **drizzle-orm 0.45** — database schemas and queries
- **@sanamyvn/foundation 1.12** — DI, HTTP, mediator, cache, database

## Development

```bash
pnpm install
pnpm run check-types       # Type check
pnpm run lint              # ESLint
pnpm run test:unit         # 29 unit tests
pnpm run test:integration  # 27 integration tests (requires Docker)
pnpm run build             # Compile to dist/
```

## License

MIT
