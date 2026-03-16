# Getting Started

Goal: create a prompt, start a conversation, and get a response in ~5 minutes.

## Prerequisites

- Node.js 22+
- pnpm
- `@sanamyvn/foundation ^1.12.0`
- `drizzle-orm >=0.45.1`

## Install

```bash
pnpm add @sanamyvn/ai-ts

# Peer dependencies
pnpm add @sanamyvn/foundation @mastra/core drizzle-orm zod
```

## Provide Infrastructure Tokens

The AI modules need a Postgres database, a Mastra agent, and a Mastra memory instance. Bind them before importing any AI module.

```typescript
import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { AI_DB } from '@sanamyvn/ai-ts/shared/tokens';
import { MASTRA_CORE_AGENT, MASTRA_CORE_MEMORY } from '@sanamyvn/ai-ts/business/mastra';
import type { Agent } from '@mastra/core/agent';
import type { MastraMemory } from '@mastra/core/memory';

// Option A: alias AI_DB to your existing Postgres token
alias(AI_DB, MY_POSTGRES);

// Option B: use PostgresModule and alias after
// PostgresModule.forRoot({ url: process.env.DATABASE_URL })

// Bind the Mastra core instances your app creates
value(MASTRA_CORE_AGENT, myAgent satisfies Agent);
value(MASTRA_CORE_MEMORY, myMemory satisfies MastraMemory);
```

## Register Modules

Import the three app modules and their monolith client providers into a single module. The app modules register routers and app-layer services. The client providers wire the mediator layer for in-process communication.

```typescript
import { Module } from '@sanamyvn/foundation/di/node/module';
import { PromptAppModule } from '@sanamyvn/ai-ts/app/prompt/module';
import { SessionAppModule } from '@sanamyvn/ai-ts/app/session/module';
import { ConversationAppModule } from '@sanamyvn/ai-ts/app/conversation/module';
import { promptClientMonolithProviders } from '@sanamyvn/ai-ts/app/prompt-client/module';
import { sessionClientMonolithProviders } from '@sanamyvn/ai-ts/app/session-client/module';
import { conversationClientMonolithProviders } from '@sanamyvn/ai-ts/app/conversation-client/module';

class AiModule extends Module {
  imports = [
    PromptAppModule.forRoot(),
    SessionAppModule.forRoot(),
    ConversationAppModule.forMonolith(),
  ];

  providers = [
    ...promptClientMonolithProviders().providers,
    ...sessionClientMonolithProviders().providers,
    ...conversationClientMonolithProviders().providers,
  ];
}
```

## Create a Prompt

Prompts are versioned templates rendered with [Mustache](https://mustache.github.io/). Create a template, then publish a version with `activate: true` so the conversation engine can resolve it.

```typescript
import type { IPromptService } from '@sanamyvn/ai-ts/business/prompt';
import { PROMPT_SERVICE } from '@sanamyvn/ai-ts/business/prompt';

const promptService = container.resolve<IPromptService>(PROMPT_SERVICE);

// 1. Create the template
const prompt = await promptService.create({
  name: 'Greeting Assistant',
  slug: 'greeting-assistant',
  parameterSchema: {
    type: 'object',
    properties: { userName: { type: 'string' } },
  },
});

// 2. Publish a version (activate immediately)
await promptService.createVersion(prompt.id, {
  template: 'You are a friendly assistant. Greet {{userName}} warmly.',
  activate: true,
});
```

## Start a Conversation

The conversation engine resolves the prompt, opens a session, and delegates to the Mastra agent.

```typescript
import type { IConversationEngine } from '@sanamyvn/ai-ts/business/conversation';
import { CONVERSATION_ENGINE } from '@sanamyvn/ai-ts/business/conversation';

const engine = container.resolve<IConversationEngine>(CONVERSATION_ENGINE);

// 1. Create a conversation (resolves prompt + starts session)
const conversation = await engine.create({
  promptSlug: 'greeting-assistant',
  promptParams: { userName: 'Alice' },
  userId: 'user-123',
  purpose: 'demo',
});

// 2. Send a message and get a response
const response = await engine.send(conversation.id, 'Hello!');
console.log(response.text);
```

The returned `Conversation` contains the `sessionId`, `resolvedPrompt`, and `model` selected for this exchange. Use `engine.stream()` instead of `engine.send()` for streaming responses.

## Next Steps

- [Configuration](./configuration.md) -- default model, prompt limits, session page size
- [Customization](./customization.md) -- swap providers, standalone deployment
- [Testing](./testing.md) -- mock factories for unit and integration tests
