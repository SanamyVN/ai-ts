# @sanamyvn/ai-ts

Shared AI primitives — prompt registry, conversation engine, session lifecycle.

## What It Does

- **Prompt registry** — versioned, parameterized system prompt templates stored in the database, rendered with Mustache at resolve time
- **Conversation engine** — orchestrates prompt resolution, session creation, and Mastra agent communication; reconstructs state across instances without sticky sessions
- **Session lifecycle** — tracks who started a conversation, why, and when, linking business context to Mastra's thread storage
- **3-layer architecture** — repository → business → app, with cross-domain communication via the mediator pattern
- **Deployment flexibility** — each domain has local and remote mediator adapters; swap `forMonolith()` to `forStandalone()` with zero code changes in the business layer

## Documentation

See the [full documentation](docs/README.md) for guides, API reference, and examples.

| Category | Guides |
|----------|--------|
| **Start Here** | [Getting Started](docs/getting-started.md), [Integration Guide](docs/integration.md) |
| **Prompt** | [Setup](docs/prompt/setup.md), [Usage](docs/prompt/usage.md), [Endpoints](docs/prompt/endpoints.md) |
| **Session** | [Setup](docs/session/setup.md), [Usage](docs/session/usage.md), [Endpoints](docs/session/endpoints.md) |
| **Conversation** | [Setup](docs/conversation/setup.md), [Usage](docs/conversation/usage.md), [Endpoints](docs/conversation/endpoints.md) |
| **Reference** | [Configuration](docs/configuration.md), [Customization](docs/customization.md), [Testing](docs/testing.md) |

## Install

```bash
pnpm add @sanamyvn/ai-ts
pnpm add @sanamyvn/foundation @mastra/core drizzle-orm zod
```

## Quick Start

```typescript
const conversation = await conversationEngine.create({
  promptSlug: 'ielts-speaking-examiner',
  promptParams: { part: 2, topic: 'describe a place' },
  userId: 'student-1',
  purpose: 'ielts-speaking',
});
const response = await conversationEngine.send(conversation.id, 'Hello!');
```

See [Getting Started](docs/getting-started.md) for the full walkthrough.

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

- [Prompt endpoints](docs/prompt/endpoints.md) (`/ai/prompts`) — create, list, get, update, version management
- [Session endpoints](docs/session/endpoints.md) (`/ai/sessions`) — list, get, messages, transcript export, end
- [Conversation endpoints](docs/conversation/endpoints.md) (`/ai/conversations`) — create, send message, stream message

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
