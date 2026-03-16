# AI Package Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@sanamy/ai` — a layered package wrapping Mastra behind stable interfaces, providing prompt registry, conversation engine, and session lifecycle for downstream AI products.

**Architecture:** Three-layer vertical slice (App → Business → Repository) following the [layered architecture](../architecture/layered-architecture.md). Cross-domain communication via [mediator pattern](../architecture/mediator-patterns.md). Mastra wrapped in `business/sdk/mastra/`. New repo cloned from `package-template`.

**Tech Stack:** TypeScript, Mastra (`@mastra/core`), Drizzle ORM, Zod v4, Foundation DI, Vitest

**Spec:** [2026-03-15-ai-package-design.md](./2026-03-15-ai-package-design.md)

---

## Import Reference

All code in this plan uses these import paths. **Do not guess paths — use this table.**

```typescript
// Foundation DI
import { createToken, createMetaKey } from '@sanamyvn/foundation/di/core/tokens';
import { value, factory, alias } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { Module } from '@sanamyvn/foundation/di/node/module';

// Foundation mediator
import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import { createQuery, createCommand, createNotify } from '@sanamyvn/foundation/mediator/request';
// NOTE: createQuery/createCommand accept raw ZodType, NOT a createSchema() wrapper
// NOTE: createMediatorToken requires (name, routes) — routes maps methods to request constructors

// Foundation HTTP
import type { IMiddleware } from '@sanamyvn/foundation/http/middleware';
import type { IRouter, IRouterBuilder } from '@sanamyvn/foundation/http/types';

// Foundation other
import type { ICache } from '@sanamyvn/foundation/cache';
import type { IMediator } from '@sanamyvn/foundation/mediator';
```

## Conventions to apply throughout

- **Mapper naming:** Include source layer in name — `toPromptTemplateFromRecord()`, not `toPromptTemplate()`. `toClientModelFromBusiness()`, `toClientModelFromApp()`.
- **Error narrowing:** Create type guard functions (`isDuplicatePromptError()`) in each error file. Use type guards instead of `instanceof` for narrowing.
- **No non-null assertions:** Instead of `record!`, guard with `if (!record) throw ...`.
- **No `as` casts:** Use `Reflect.get()` for dynamic property access, or write type guard functions.
- **Mediator schemas:** Pass raw `z.object({...})` to `createQuery`/`createCommand`, not wrapped in `createSchema()`.

---

## Chunk 1: Package Setup + Shared Infrastructure

### Task 1: Scaffold package from template

**Files:**

- Copy: `../package-template/` → `../ai/`
- Modify: `package.json`
- Create: `CLAUDE.md`

- [ ] **Step 1: Duplicate template**

```bash
cp -r /Users/maw/Workspace/sanamy/package-template /Users/maw/Workspace/sanamy/ai
cd /Users/maw/Workspace/sanamy/ai
rm -rf .git node_modules dist
git init
```

- [ ] **Step 2: Update package.json**

Set name to `@sanamyvn/ai`, add description, add runtime and peer dependencies:

```json
{
  "name": "@sanamyvn/ai",
  "description": "Shared AI primitives — prompt registry, conversation engine, session lifecycle",
  "dependencies": {
    "mustache": "^4.0.0"
  },
  "peerDependencies": {
    "@sanamyvn/foundation": "^1.12.0",
    "@mastra/core": "^1.0.0",
    "drizzle-orm": ">=0.45.1",
    "zod": "^4.0.0"
  }
}
```

Also install dev dependencies:

```bash
pnpm add -D @mastra/core @sanamyvn/foundation@^1.12.0 drizzle-orm zod@^4.0.0
pnpm add mustache
pnpm add -D @types/mustache
```

- [ ] **Step 3: Create CLAUDE.md**

Create `CLAUDE.md` at repo root. Copy the foundation `CLAUDE.md` conventions and adapt for the AI package context. Key additions:

- Reference the spec doc for architecture decisions
- Note that `@mastra/core` is only imported inside `business/sdk/mastra/`
- Note that Zod v4 syntax must be used (top-level `z.email()`, `{ error: }` not `{ message: }`, etc.)

- [ ] **Step 4: Delete src/index.ts placeholder, install deps, verify build**

```bash
rm src/index.ts
pnpm install
pnpm run check-types
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold AI package from template"
```

---

### Task 2: Shared tokens

**Files:**

- Create: `src/shared/tokens.ts`

**Error convention:** There is no package-wide base error. Each domain layer defines its own base error class that auto-sets `.name` via `new.target.name` and preserves the cause chain. See Task 4 for the pattern.

- [ ] **Step 1: Create shared tokens**

```typescript
// src/shared/tokens.ts
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { ICache } from '@sanamyvn/foundation/cache';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';

export const AI_DB = createToken<PostgresJsDatabase>('AI_DB');
export const AI_CACHE = createToken<ICache>('AI_CACHE');
export const AI_MEDIATOR = createToken<IMediator>('AI_MEDIATOR');
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/tokens.ts
git commit -m "feat: add shared DI tokens"
```

---

### Task 3: Config schema

**Files:**

- Create: `src/config.ts`
- Create: `src/config.spec.ts`

- [ ] **Step 1: Write config test**

```typescript
// src/config.spec.ts
import { describe, expect, it } from 'vitest';
import { aiConfigSchema } from './config.js';

describe('aiConfigSchema', () => {
  it('provides defaults when no config given', () => {
    const config = aiConfigSchema.parse({});
    expect(config.defaultModel).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.prompt.maxVersions).toBe(50);
    expect(config.session.transcriptPageSize).toBe(100);
  });

  it('accepts custom model', () => {
    const config = aiConfigSchema.parse({ defaultModel: 'openai/gpt-4o' });
    expect(config.defaultModel).toBe('openai/gpt-4o');
  });

  it('rejects invalid config', () => {
    const result = aiConfigSchema.safeParse({ defaultModel: 123 });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement config schema**

```typescript
// src/config.ts
import { z } from 'zod';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';

const promptConfigSchema = z.object({
  maxVersions: z.number().int().positive().default(50),
});

const sessionConfigSchema = z.object({
  transcriptPageSize: z.number().int().positive().default(100),
});

export const aiConfigSchema = z.object({
  defaultModel: z.string().default('anthropic/claude-sonnet-4-20250514'),
  prompt: promptConfigSchema.default({}),
  session: sessionConfigSchema.default({}),
});

export type AiConfig = z.infer<typeof aiConfigSchema>;
export type AiConfigInput = z.input<typeof aiConfigSchema>;

export const AI_CONFIG = createToken<AiConfig>('AI_CONFIG');
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/config.spec.ts
git commit -m "feat: add AI config schema with defaults"
```

---

## Chunk 2: Repository Layer

### Task 4: Prompt repository

**Files:**

- Create: `src/repository/domain/prompt/prompt.schema.ts`
- Create: `src/repository/domain/prompt/prompt.model.ts`
- Create: `src/repository/domain/prompt/prompt.interface.ts`
- Create: `src/repository/domain/prompt/prompt.error.ts`
- Create: `src/repository/domain/prompt/prompt.db.ts`
- Create: `src/repository/domain/prompt/prompt.db.spec.ts`
- Create: `src/repository/domain/prompt/prompt.providers.ts`
- Create: `src/repository/domain/prompt/prompt.testing.ts`

- [ ] **Step 1: Create Drizzle schema**

```typescript
// src/repository/domain/prompt/prompt.schema.ts
import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const aiPrompts = pgTable('ai_prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  parameterSchema: jsonb('parameter_schema').$type<Record<string, unknown>>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Create model types**

```typescript
// src/repository/domain/prompt/prompt.model.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { aiPrompts } from './prompt.schema.js';

export type PromptRecord = InferSelectModel<typeof aiPrompts>;
export type NewPromptRecord = InferInsertModel<typeof aiPrompts>;
```

- [ ] **Step 3: Create repository errors**

```typescript
// src/repository/domain/prompt/prompt.error.ts

/** Base error for prompt repository operations. */
export class PromptRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class DuplicatePromptError extends PromptRepositoryError {
  constructor(
    public readonly slug: string,
    cause?: unknown,
  ) {
    super(`Prompt with slug "${slug}" already exists`, { cause });
  }
}

export class PromptNotFoundRepoError extends PromptRepositoryError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt not found: ${identifier}`, { cause });
  }
}

export function isDuplicatePromptError(error: unknown): error is DuplicatePromptError {
  return error instanceof DuplicatePromptError;
}

export function isPromptNotFoundRepoError(error: unknown): error is PromptNotFoundRepoError {
  return error instanceof PromptNotFoundRepoError;
}
```

- [ ] **Step 4: Create repository interface**

```typescript
// src/repository/domain/prompt/prompt.interface.ts
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { PromptRecord, NewPromptRecord } from './prompt.model.js';

export interface IPromptRepository {
  create(data: NewPromptRecord): Promise<PromptRecord>;
  findById(id: string): Promise<PromptRecord | undefined>;
  findBySlug(slug: string): Promise<PromptRecord | undefined>;
  list(filter?: { search?: string }): Promise<PromptRecord[]>;
  update(id: string, data: Partial<NewPromptRecord>): Promise<PromptRecord>;
  delete(id: string): Promise<void>;
}

export const PROMPT_REPOSITORY = createToken<IPromptRepository>('PROMPT_REPOSITORY');
```

- [ ] **Step 5: Write repository implementation test**

```typescript
// src/repository/domain/prompt/prompt.db.spec.ts
import { describe, expect, it, vi } from 'vitest';
import { createMockPromptRepository } from './prompt.testing.js';

describe('PromptDrizzleRepository', () => {
  // Integration tests live in src/__tests__/integration/
  // Unit test just verifies the mock factory works
  it('mock factory returns all methods', () => {
    const mock = createMockPromptRepository();
    expect(mock.create).toBeDefined();
    expect(mock.findById).toBeDefined();
    expect(mock.findBySlug).toBeDefined();
    expect(mock.list).toBeDefined();
    expect(mock.update).toBeDefined();
    expect(mock.delete).toBeDefined();
  });
});
```

- [ ] **Step 6: Implement Drizzle repository**

```typescript
// src/repository/domain/prompt/prompt.db.ts
import { eq, ilike } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { aiPrompts } from './prompt.schema.js';
import type { IPromptRepository } from './prompt.interface.js';
import type { PromptRecord, NewPromptRecord } from './prompt.model.js';
import { DuplicatePromptError, PromptNotFoundRepoError } from './prompt.error.js';

export class PromptDrizzleRepository implements IPromptRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(data: NewPromptRecord): Promise<PromptRecord> {
    try {
      const [record] = await this.db.insert(aiPrompts).values(data).returning();
      if (!record) {
        throw new PromptRepositoryError('Insert returned no rows');
      }
      return record;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicatePromptError(data.slug, error);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<PromptRecord | undefined> {
    const [record] = await this.db.select().from(aiPrompts).where(eq(aiPrompts.id, id));
    return record;
  }

  async findBySlug(slug: string): Promise<PromptRecord | undefined> {
    const [record] = await this.db.select().from(aiPrompts).where(eq(aiPrompts.slug, slug));
    return record;
  }

  async list(filter?: { search?: string }): Promise<PromptRecord[]> {
    const query = this.db.select().from(aiPrompts);
    if (filter?.search) {
      return query.where(ilike(aiPrompts.name, `%${filter.search}%`));
    }
    return query;
  }

  async update(id: string, data: Partial<NewPromptRecord>): Promise<PromptRecord> {
    const [record] = await this.db
      .update(aiPrompts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiPrompts.id, id))
      .returning();
    if (!record) {
      throw new PromptNotFoundRepoError(id);
    }
    return record;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(aiPrompts).where(eq(aiPrompts.id, id));
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Reflect.get(error, 'code') === '23505'
  );
}
```

- [ ] **Step 7: Create mock factory**

```typescript
// src/repository/domain/prompt/prompt.testing.ts
import { vi } from 'vitest';
import type { IPromptRepository } from './prompt.interface.js';

export function createMockPromptRepository(): IPromptRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
```

- [ ] **Step 8: Create providers**

```typescript
// src/repository/domain/prompt/prompt.providers.ts
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { PROMPT_REPOSITORY } from './prompt.interface.js';
import { PromptDrizzleRepository } from './prompt.db.js';

export function promptRepoProviders() {
  return {
    providers: [bind(PROMPT_REPOSITORY, PromptDrizzleRepository)],
    exports: [PROMPT_REPOSITORY],
  };
}
```

- [ ] **Step 9: Run tests, commit**

```bash
pnpm vitest run src/repository/domain/prompt/
git add src/repository/domain/prompt/
git commit -m "feat: add prompt repository with Drizzle implementation"
```

---

### Task 5: Prompt version repository

**Files:** Same pattern as Task 4, under `src/repository/domain/prompt-version/`

- [ ] **Step 1: Create schema**

```typescript
// src/repository/domain/prompt-version/prompt-version.schema.ts
import { pgTable, uuid, integer, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { aiPrompts } from '../prompt/prompt.schema.js';

export const aiPromptVersions = pgTable('ai_prompt_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  promptId: uuid('prompt_id')
    .notNull()
    .references(() => aiPrompts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  template: text('template').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Create model, interface, errors, implementation, mock factory, providers**

Follow the exact pattern from Task 4. Key differences:

**Interface:**

```typescript
export interface IPromptVersionRepository {
  create(data: NewPromptVersionRecord): Promise<PromptVersionRecord>;
  findById(id: string): Promise<PromptVersionRecord | undefined>;
  findActiveByPromptId(promptId: string): Promise<PromptVersionRecord | undefined>;
  listByPromptId(promptId: string): Promise<PromptVersionRecord[]>;
  setActive(promptId: string, versionId: string): Promise<void>;
  getNextVersion(promptId: string): Promise<number>;
}
```

**Errors:** `PromptVersionNotFoundRepoError`

**setActive implementation:** Within a transaction, set all versions for the promptId to `isActive: false`, then set the target version to `isActive: true`.

**getNextVersion:** `SELECT COALESCE(MAX(version), 0) + 1 FROM ai_prompt_versions WHERE prompt_id = $1`

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run src/repository/domain/prompt-version/
git add src/repository/domain/prompt-version/
git commit -m "feat: add prompt version repository"
```

---

### Task 6: Session repository

**Files:** Same pattern as Task 4, under `src/repository/domain/session/`

- [ ] **Step 1: Create schema**

```typescript
// src/repository/domain/session/session.schema.ts
import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const aiSessions = pgTable('ai_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  mastraThreadId: varchar('mastra_thread_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  tenantId: varchar('tenant_id', { length: 255 }),
  promptSlug: varchar('prompt_slug', { length: 255 }).notNull(),
  purpose: varchar('purpose', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});
```

- [ ] **Step 2: Create model, interface, errors, implementation, mock factory, providers**

Follow Task 4 pattern. Key differences:

**Interface:**

```typescript
export interface ISessionRepository {
  create(data: NewSessionRecord): Promise<SessionRecord>;
  findById(id: string): Promise<SessionRecord | undefined>;
  list(filter: SessionRepoFilter): Promise<SessionRecord[]>;
  updateStatus(id: string, status: string, endedAt?: Date): Promise<SessionRecord>;
}

export interface SessionRepoFilter {
  userId?: string;
  tenantId?: string;
  purpose?: string;
  status?: string;
}
```

**Errors:** `SessionNotFoundRepoError`

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run src/repository/domain/session/
git add src/repository/domain/session/
git commit -m "feat: add session repository"
```

---

### Task 7: Repository providers bundle

**Files:**

- Create: `src/repository/providers.ts`

- [ ] **Step 1: Create ProviderBundle type**

```typescript
// src/shared/provider-bundle.ts
import type { Provider, IToken } from '@sanamyvn/foundation/di/core/tokens';

export interface ProviderBundle {
  readonly providers: Provider[];
  readonly exports: IToken<unknown>[];
}
```

- [ ] **Step 2: Create layer-wide provider bundle**

```typescript
// src/repository/providers.ts
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { promptRepoProviders } from './domain/prompt/prompt.providers.js';
import { promptVersionRepoProviders } from './domain/prompt-version/prompt-version.providers.js';
import { sessionRepoProviders } from './domain/session/session.providers.js';

export function aiRepoProviders(): ProviderBundle {
  const prompt = promptRepoProviders();
  const promptVersion = promptVersionRepoProviders();
  const session = sessionRepoProviders();

  return {
    providers: [...prompt.providers, ...promptVersion.providers, ...session.providers],
    exports: [...prompt.exports, ...promptVersion.exports, ...session.exports],
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/repository/providers.ts src/shared/provider-bundle.ts
git commit -m "feat: add repository layer provider bundle"
```

---

## Chunk 3: Business SDK (Mastra Adapter)

### Task 8: Mastra interfaces

**Files:**

- Create: `src/business/sdk/mastra/mastra.interface.ts`
- Create: `src/business/sdk/mastra/mastra.error.ts`
- Create: `src/business/sdk/mastra/mastra.error.spec.ts`

- [ ] **Step 1: Define adapter interfaces**

```typescript
// src/business/sdk/mastra/mastra.interface.ts
import { createToken } from '@sanamyvn/foundation/di/core/tokens';

export interface AgentResponse {
  readonly text: string;
  readonly object?: unknown;
  readonly threadId: string;
}

export interface StreamChunk {
  readonly type: 'text-delta' | 'tool-call' | 'finish';
  readonly content: string;
}

export interface GenerateOptions {
  readonly threadId?: string;
  readonly resourceId?: string;
  readonly outputSchema?: unknown;
}

export interface Thread {
  readonly id: string;
  readonly resourceId: string;
  readonly title?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface Message {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly createdAt: Date;
}

export interface Pagination {
  readonly page: number;
  readonly perPage: number;
}

export interface MessageList {
  readonly messages: Message[];
  readonly page: number;
  readonly perPage: number;
}

export interface ThreadFilter {
  readonly resourceId?: string;
}

export interface IMastraAgent {
  generate(prompt: string, options?: GenerateOptions): Promise<AgentResponse>;
  stream(prompt: string, options?: GenerateOptions): AsyncIterable<StreamChunk>;
}

export interface IMastraMemory {
  createThread(resourceId: string): Promise<Thread>;
  getMessages(threadId: string, pagination: Pagination): Promise<MessageList>;
  listThreads(filter?: ThreadFilter): Promise<Thread[]>;
}

export const MASTRA_AGENT = createToken<IMastraAgent>('MASTRA_AGENT');
export const MASTRA_MEMORY = createToken<IMastraMemory>('MASTRA_MEMORY');
```

- [ ] **Step 2: Create adapter error with test**

```typescript
// src/business/sdk/mastra/mastra.error.ts

/** Base error for Mastra adapter operations. */
export class MastraAdapterError extends Error {
  constructor(
    public readonly operation: string,
    cause?: unknown,
  ) {
    super(`Mastra operation failed: ${operation}`, { cause });
    this.name = new.target.name;
  }
}

export function isMastraAdapterError(error: unknown): error is MastraAdapterError {
  return error instanceof MastraAdapterError;
}
```

```typescript
// src/business/sdk/mastra/mastra.error.spec.ts
import { describe, expect, it } from 'vitest';
import { MastraAdapterError, isMastraAdapterError } from './mastra.error.js';

describe('MastraAdapterError', () => {
  it('sets name and operation', () => {
    const error = new MastraAdapterError('generate');
    expect(error.name).toBe('MastraAdapterError');
    expect(error.operation).toBe('generate');
  });

  it('wraps cause', () => {
    const cause = new Error('network');
    const error = new MastraAdapterError('generate', cause);
    expect(error.cause).toBe(cause);
  });

  it('type guard narrows correctly', () => {
    const error = new MastraAdapterError('generate');
    expect(isMastraAdapterError(error)).toBe(true);
    expect(isMastraAdapterError(new Error('other'))).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run src/business/sdk/mastra/
git add src/business/sdk/mastra/
git commit -m "feat: add Mastra adapter interfaces and error"
```

---

### Task 9: Mastra adapter implementations

**Files:**

- Create: `src/business/sdk/mastra/adapters/mastra.agent.ts`
- Create: `src/business/sdk/mastra/adapters/mastra.memory.ts`
- Create: `src/business/sdk/mastra/mastra.testing.ts`
- Create: `src/business/sdk/mastra/mastra.providers.ts`

- [ ] **Step 1: Implement agent adapter**

This wraps `@mastra/core` Agent. All Mastra exceptions caught at this boundary.

```typescript
// src/business/sdk/mastra/adapters/mastra.agent.ts
import type { Agent } from '@mastra/core';
import type {
  IMastraAgent,
  AgentResponse,
  StreamChunk,
  GenerateOptions,
} from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

export class MastraAgentAdapter implements IMastraAgent {
  constructor(private readonly agent: Agent) {}

  async generate(prompt: string, options?: GenerateOptions): Promise<AgentResponse> {
    try {
      const result = await this.agent.generate(prompt, {
        ...(options?.threadId !== undefined ? { threadId: options.threadId } : {}),
        ...(options?.resourceId !== undefined ? { resourceId: options.resourceId } : {}),
        ...(options?.outputSchema !== undefined ? { structuredOutput: options.outputSchema } : {}),
      });
      return {
        text: result.text,
        object: result.object,
        threadId: result.threadId,
      };
    } catch (error) {
      throw new MastraAdapterError('generate', error);
    }
  }

  async *stream(prompt: string, options?: GenerateOptions): AsyncIterable<StreamChunk> {
    try {
      const result = await this.agent.stream(prompt, {
        ...(options?.threadId !== undefined ? { threadId: options.threadId } : {}),
        ...(options?.resourceId !== undefined ? { resourceId: options.resourceId } : {}),
        ...(options?.outputSchema !== undefined ? { structuredOutput: options.outputSchema } : {}),
      });
      for await (const chunk of result.textStream) {
        yield { type: 'text-delta', content: chunk };
      }
    } catch (error) {
      throw new MastraAdapterError('stream', error);
    }
  }
}
```

- [ ] **Step 2: Implement memory adapter**

```typescript
// src/business/sdk/mastra/adapters/mastra.memory.ts
import type { MastraMemory } from '@mastra/core';
import type {
  IMastraMemory,
  Thread,
  MessageList,
  Pagination,
  ThreadFilter,
} from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

export class MastraMemoryAdapter implements IMastraMemory {
  constructor(private readonly memory: MastraMemory) {}

  async createThread(resourceId: string): Promise<Thread> {
    try {
      const thread = await this.memory.createThread({ resourceId });
      return {
        id: thread.id,
        resourceId: thread.resourceId,
        title: thread.title,
        metadata: thread.metadata,
      };
    } catch (error) {
      throw new MastraAdapterError('createThread', error);
    }
  }

  async getMessages(threadId: string, pagination: Pagination): Promise<MessageList> {
    try {
      const { messages } = await this.memory.recall({
        threadId,
        page: pagination.page,
        perPage: pagination.perPage,
        orderBy: { field: 'createdAt', direction: 'ASC' },
      });
      return {
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          createdAt: m.createdAt,
        })),
        page: pagination.page,
        perPage: pagination.perPage,
      };
    } catch (error) {
      throw new MastraAdapterError('getMessages', error);
    }
  }

  async listThreads(filter?: ThreadFilter): Promise<Thread[]> {
    try {
      const threads = await this.memory.listThreads({
        ...(filter?.resourceId !== undefined ? { filter: { resourceId: filter.resourceId } } : {}),
      });
      return threads.map((t) => ({
        id: t.id,
        resourceId: t.resourceId,
        title: t.title,
        metadata: t.metadata,
      }));
    } catch (error) {
      throw new MastraAdapterError('listThreads', error);
    }
  }
}
```

- [ ] **Step 3: Create mock factories**

```typescript
// src/business/sdk/mastra/mastra.testing.ts
import { vi } from 'vitest';
import type { IMastraAgent, IMastraMemory } from './mastra.interface.js';

export function createMockMastraAgent(): IMastraAgent {
  return {
    generate: vi.fn(),
    stream: vi.fn(),
  };
}

export function createMockMastraMemory(): IMastraMemory {
  return {
    createThread: vi.fn(),
    getMessages: vi.fn(),
    listThreads: vi.fn(),
  };
}
```

- [ ] **Step 4: Create providers**

```typescript
// src/business/sdk/mastra/mastra.providers.ts
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_AGENT, MASTRA_MEMORY } from './mastra.interface.js';
import { MastraAgentAdapter } from './adapters/mastra.agent.js';
import { MastraMemoryAdapter } from './adapters/mastra.memory.js';

export function mastraProviders() {
  return {
    providers: [bind(MASTRA_AGENT, MastraAgentAdapter), bind(MASTRA_MEMORY, MastraMemoryAdapter)],
    exports: [MASTRA_AGENT, MASTRA_MEMORY],
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/business/sdk/mastra/
git commit -m "feat: add Mastra agent and memory adapters"
```

---

## Chunk 4: Business Domain — Prompt

### Task 10: Prompt business errors and models

**Files:**

- Create: `src/business/domain/prompt/prompt.error.ts`
- Create: `src/business/domain/prompt/prompt.model.ts`

- [ ] **Step 1: Create business errors**

```typescript
// src/business/domain/prompt/prompt.error.ts

/** Base error for prompt business operations. */
export class PromptError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class PromptNotFoundError extends PromptError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt not found: ${identifier}`, { cause });
  }
}

export class PromptAlreadyExistsError extends PromptError {
  constructor(
    public readonly slug: string,
    cause?: unknown,
  ) {
    super(`Prompt already exists: ${slug}`, { cause });
  }
}

export class PromptVersionNotFoundError extends PromptError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt version not found: ${identifier}`, { cause });
  }
}

export class InvalidPromptParametersError extends PromptError {
  constructor(
    public readonly slug: string,
    public readonly details: string,
    cause?: unknown,
  ) {
    super(`Invalid parameters for prompt "${slug}": ${details}`, { cause });
  }
}

export class PromptRenderError extends PromptError {
  constructor(
    public readonly slug: string,
    cause?: unknown,
  ) {
    super(`Failed to render prompt template "${slug}"`, { cause });
  }
}

export function isPromptNotFoundError(error: unknown): error is PromptNotFoundError {
  return error instanceof PromptNotFoundError;
}

export function isPromptAlreadyExistsError(error: unknown): error is PromptAlreadyExistsError {
  return error instanceof PromptAlreadyExistsError;
}
```

- [ ] **Step 2: Create business models**

```typescript
// src/business/domain/prompt/prompt.model.ts
export interface PromptTemplate {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly parameterSchema: Record<string, unknown> | null;
  readonly metadata: Record<string, unknown> | null;
  readonly activeVersion?: PromptVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PromptVersion {
  readonly id: string;
  readonly promptId: string;
  readonly version: number;
  readonly template: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export interface ResolvedPrompt {
  readonly slug: string;
  readonly version: number;
  readonly text: string;
}

export interface CreatePromptInput {
  readonly name: string;
  readonly slug: string;
  readonly parameterSchema?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdatePromptInput {
  readonly name?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface CreateVersionInput {
  readonly template: string;
  readonly activate?: boolean;
}

export interface PromptFilter {
  readonly search?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/prompt/
git commit -m "feat: add prompt business errors and models"
```

---

### Task 11: Prompt service interface and implementation

**Files:**

- Create: `src/business/domain/prompt/prompt.interface.ts`
- Create: `src/business/domain/prompt/prompt.business.ts`
- Create: `src/business/domain/prompt/prompt.business.spec.ts`
- Create: `src/business/domain/prompt/prompt.mapper.ts`
- Create: `src/business/domain/prompt/prompt.providers.ts`
- Create: `src/business/domain/prompt/prompt.testing.ts`

- [ ] **Step 1: Create interface**

```typescript
// src/business/domain/prompt/prompt.interface.ts
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  PromptTemplate,
  PromptVersion,
  ResolvedPrompt,
  CreatePromptInput,
  UpdatePromptInput,
  CreateVersionInput,
  PromptFilter,
} from './prompt.model.js';

export interface IPromptService {
  create(input: CreatePromptInput): Promise<PromptTemplate>;
  getBySlug(slug: string): Promise<PromptTemplate>;
  list(filter?: PromptFilter): Promise<PromptTemplate[]>;
  update(id: string, input: UpdatePromptInput): Promise<PromptTemplate>;

  createVersion(promptId: string, input: CreateVersionInput): Promise<PromptVersion>;
  listVersions(promptId: string): Promise<PromptVersion[]>;
  setActiveVersion(promptId: string, versionId: string): Promise<void>;

  resolve(slug: string, params: Record<string, unknown>): Promise<ResolvedPrompt>;
}

export const PROMPT_SERVICE = createToken<IPromptService>('PROMPT_SERVICE');
```

- [ ] **Step 2: Create mapper**

```typescript
// src/business/domain/prompt/prompt.mapper.ts
import type { PromptRecord } from '@/repository/domain/prompt/prompt.model.js';
import type { PromptVersionRecord } from '@/repository/domain/prompt-version/prompt-version.model.js';
import type { PromptTemplate, PromptVersion } from './prompt.model.js';

export function toPromptTemplateFromRecord(
  record: PromptRecord,
  activeVersion?: PromptVersionRecord,
): PromptTemplate {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    parameterSchema: record.parameterSchema,
    metadata: record.metadata,
    ...(activeVersion !== undefined
      ? { activeVersion: toPromptVersionFromRecord(activeVersion) }
      : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toPromptVersionFromRecord(record: PromptVersionRecord): PromptVersion {
  return {
    id: record.id,
    promptId: record.promptId,
    version: record.version,
    template: record.template,
    isActive: record.isActive,
    createdAt: record.createdAt,
  };
}
```

- [ ] **Step 3: Write service tests**

```typescript
// src/business/domain/prompt/prompt.business.spec.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PromptService } from './prompt.business.js';
import { createMockPromptRepository } from '@/repository/domain/prompt/prompt.testing.js';
import { createMockPromptVersionRepository } from '@/repository/domain/prompt-version/prompt-version.testing.js';
import { PromptNotFoundError, InvalidPromptParametersError } from './prompt.error.js';
import { DuplicatePromptError } from '@/repository/domain/prompt/prompt.error.js';
import { PromptAlreadyExistsError } from './prompt.error.js';

describe('PromptService', () => {
  let service: PromptService;
  let promptRepo: ReturnType<typeof createMockPromptRepository>;
  let versionRepo: ReturnType<typeof createMockPromptVersionRepository>;

  beforeEach(() => {
    promptRepo = createMockPromptRepository();
    versionRepo = createMockPromptVersionRepository();
    service = new PromptService(promptRepo, versionRepo);
  });

  describe('getBySlug', () => {
    it('returns prompt with active version', async () => {
      const record = {
        id: '1',
        name: 'Test',
        slug: 'test',
        parameterSchema: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const version = {
        id: 'v1',
        promptId: '1',
        version: 1,
        template: 'Hello {{name}}',
        isActive: true,
        createdAt: new Date(),
      };
      promptRepo.findBySlug.mockResolvedValue(record);
      versionRepo.findActiveByPromptId.mockResolvedValue(version);

      const result = await service.getBySlug('test');
      expect(result.slug).toBe('test');
      expect(result.activeVersion?.template).toBe('Hello {{name}}');
    });

    it('throws PromptNotFoundError when slug not found', async () => {
      promptRepo.findBySlug.mockResolvedValue(undefined);
      await expect(service.getBySlug('missing')).rejects.toThrow(PromptNotFoundError);
    });
  });

  describe('create', () => {
    it('wraps DuplicatePromptError into PromptAlreadyExistsError', async () => {
      promptRepo.create.mockRejectedValue(new DuplicatePromptError('test'));
      await expect(service.create({ name: 'Test', slug: 'test' })).rejects.toThrow(
        PromptAlreadyExistsError,
      );
    });
  });

  describe('resolve', () => {
    it('renders template with parameters', async () => {
      const record = {
        id: '1',
        name: 'Test',
        slug: 'test',
        parameterSchema: { name: { type: 'string' } },
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const version = {
        id: 'v1',
        promptId: '1',
        version: 1,
        template: 'Hello {{name}}, welcome!',
        isActive: true,
        createdAt: new Date(),
      };
      promptRepo.findBySlug.mockResolvedValue(record);
      versionRepo.findActiveByPromptId.mockResolvedValue(version);

      const result = await service.resolve('test', { name: 'World' });
      expect(result.text).toBe('Hello World, welcome!');
      expect(result.version).toBe(1);
    });

    it('throws when no active version exists', async () => {
      const record = {
        id: '1',
        name: 'Test',
        slug: 'test',
        parameterSchema: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      promptRepo.findBySlug.mockResolvedValue(record);
      versionRepo.findActiveByPromptId.mockResolvedValue(undefined);

      await expect(service.resolve('test', {})).rejects.toThrow(PromptNotFoundError);
    });
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

- [ ] **Step 5: Implement PromptService**

```typescript
// src/business/domain/prompt/prompt.business.ts
import Mustache from 'mustache';
import type { IPromptRepository } from '@/repository/domain/prompt/prompt.interface.js';
import type { IPromptVersionRepository } from '@/repository/domain/prompt-version/prompt-version.interface.js';
import { isDuplicatePromptError } from '@/repository/domain/prompt/prompt.error.js';
import type { IPromptVersionRepository } from '@/repository/domain/prompt-version/prompt-version.interface.js';
import type { IPromptService } from './prompt.interface.js';
import type {
  PromptTemplate,
  PromptVersion,
  ResolvedPrompt,
  CreatePromptInput,
  UpdatePromptInput,
  CreateVersionInput,
  PromptFilter,
} from './prompt.model.js';
import {
  PromptNotFoundError,
  PromptAlreadyExistsError,
  PromptRenderError,
  InvalidPromptParametersError,
} from './prompt.error.js';
import { toPromptTemplateFromRecord, toPromptVersionFromRecord } from './prompt.mapper.js';

export class PromptService implements IPromptService {
  constructor(
    private readonly promptRepo: IPromptRepository,
    private readonly versionRepo: IPromptVersionRepository,
  ) {}

  async create(input: CreatePromptInput): Promise<PromptTemplate> {
    try {
      const record = await this.promptRepo.create(input);
      return toPromptTemplateFromRecord(record);
    } catch (error) {
      if (isDuplicatePromptError(error)) {
        throw new PromptAlreadyExistsError(input.slug, error);
      }
      throw error;
    }
  }

  async getBySlug(slug: string): Promise<PromptTemplate> {
    const record = await this.promptRepo.findBySlug(slug);
    if (!record) {
      throw new PromptNotFoundError(slug);
    }
    const activeVersion = await this.versionRepo.findActiveByPromptId(record.id);
    return toPromptTemplateFromRecord(record, activeVersion ?? undefined);
  }

  async list(filter?: PromptFilter): Promise<PromptTemplate[]> {
    const records = await this.promptRepo.list(filter);
    return records.map((r) => toPromptTemplateFromRecord(r));
  }

  async update(id: string, input: UpdatePromptInput): Promise<PromptTemplate> {
    const record = await this.promptRepo.update(id, input);
    return toPromptTemplateFromRecord(record);
  }

  async createVersion(promptId: string, input: CreateVersionInput): Promise<PromptVersion> {
    const nextVersion = await this.versionRepo.getNextVersion(promptId);
    const record = await this.versionRepo.create({
      promptId,
      version: nextVersion,
      template: input.template,
      isActive: input.activate ?? false,
    });
    if (input.activate) {
      await this.versionRepo.setActive(promptId, record.id);
    }
    return toPromptVersion(record);
  }

  async listVersions(promptId: string): Promise<PromptVersion[]> {
    const records = await this.versionRepo.listByPromptId(promptId);
    return records.map(toPromptVersionFromRecord);
  }

  async setActiveVersion(promptId: string, versionId: string): Promise<void> {
    await this.versionRepo.setActive(promptId, versionId);
  }

  async resolve(slug: string, params: Record<string, unknown>): Promise<ResolvedPrompt> {
    const record = await this.promptRepo.findBySlug(slug);
    if (!record) {
      throw new PromptNotFoundError(slug);
    }
    const activeVersion = await this.versionRepo.findActiveByPromptId(record.id);
    if (!activeVersion) {
      throw new PromptNotFoundError(`${slug} (no active version)`);
    }
    // Validate params against stored parameter schema (JSON Schema subset → Zod)
    if (record.parameterSchema) {
      this.validateParams(slug, record.parameterSchema, params);
    }
    try {
      const text = Mustache.render(activeVersion.template, params);
      return { slug, version: activeVersion.version, text };
    } catch (error) {
      throw new PromptRenderError(slug, error);
    }
  }

  private validateParams(
    slug: string,
    schema: Record<string, unknown>,
    params: Record<string, unknown>,
  ): void {
    // Convert JSON Schema subset to Zod and validate
    // Schema format: { "name": { "type": "string" }, "count": { "type": "number", "min": 1 } }
    for (const [key, def] of Object.entries(schema)) {
      const fieldDef = def as { type: string; min?: number; max?: number };
      const value = params[key];
      if (value === undefined) {
        throw new InvalidPromptParametersError(slug, `Missing required parameter: ${key}`);
      }
      if (fieldDef.type === 'string' && typeof value !== 'string') {
        throw new InvalidPromptParametersError(slug, `Parameter "${key}" must be a string`);
      }
      if (fieldDef.type === 'number' && typeof value !== 'number') {
        throw new InvalidPromptParametersError(slug, `Parameter "${key}" must be a number`);
      }
      if (fieldDef.type === 'number' && typeof value === 'number') {
        if (fieldDef.min !== undefined && value < fieldDef.min) {
          throw new InvalidPromptParametersError(
            slug,
            `Parameter "${key}" must be >= ${fieldDef.min}`,
          );
        }
        if (fieldDef.max !== undefined && value > fieldDef.max) {
          throw new InvalidPromptParametersError(
            slug,
            `Parameter "${key}" must be <= ${fieldDef.max}`,
          );
        }
      }
    }
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

- [ ] **Step 7: Create mock factory and providers**

```typescript
// src/business/domain/prompt/prompt.testing.ts
import { vi } from 'vitest';
import type { IPromptService } from './prompt.interface.js';

export function createMockPromptService(): IPromptService {
  return {
    create: vi.fn(),
    getBySlug: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    createVersion: vi.fn(),
    listVersions: vi.fn(),
    setActiveVersion: vi.fn(),
    resolve: vi.fn(),
  };
}
```

```typescript
// src/business/domain/prompt/prompt.providers.ts
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { PROMPT_SERVICE } from './prompt.interface.js';
import { PromptService } from './prompt.business.js';

export function promptBusinessProviders() {
  return {
    providers: [bind(PROMPT_SERVICE, PromptService)],
    exports: [PROMPT_SERVICE],
  };
}
```

- [ ] **Step 8: Commit**

```bash
git add src/business/domain/prompt/
git commit -m "feat: add prompt business service with versioning and template rendering"
```

---

### Task 12: Prompt mediator contracts

**Files:**

- Create: `src/business/domain/prompt/client/schemas.ts`
- Create: `src/business/domain/prompt/client/queries.ts`
- Create: `src/business/domain/prompt/client/errors.ts`
- Create: `src/business/domain/prompt/client/mediator.ts`

- [ ] **Step 1: Create client schemas**

```typescript
// src/business/domain/prompt/client/schemas.ts
import { z } from 'zod';

export const promptClientModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parameterSchema: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  activeVersion: z
    .object({
      id: z.string(),
      version: z.number(),
      template: z.string(),
      isActive: z.boolean(),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PromptClientModel = z.infer<typeof promptClientModelSchema>;

export const resolvedPromptClientSchema = z.object({
  slug: z.string(),
  version: z.number(),
  text: z.string(),
});

export type ResolvedPromptClient = z.infer<typeof resolvedPromptClientSchema>;
```

- [ ] **Step 2: Create queries and commands**

Follow the mediator-patterns convention — queries and commands in one file. `createQuery`/`createCommand` accept raw `ZodType`, no wrapper.

```typescript
// src/business/domain/prompt/client/queries.ts
import { z } from 'zod';
import { createQuery, createCommand } from '@sanamyvn/foundation/mediator/request';
import { promptClientModelSchema, resolvedPromptClientSchema } from './schemas.js';

export const FindPromptBySlugQuery = createQuery({
  type: 'ai.prompt.findBySlug',
  payload: z.object({ slug: z.string() }),
  response: promptClientModelSchema,
});

export const ListPromptsQuery = createQuery({
  type: 'ai.prompt.list',
  payload: z.object({ search: z.string().optional() }),
  response: z.array(promptClientModelSchema),
});

export const ResolvePromptQuery = createQuery({
  type: 'ai.prompt.resolve',
  payload: z.object({
    slug: z.string(),
    params: z.record(z.string(), z.unknown()),
  }),
  response: resolvedPromptClientSchema,
});

export const CreatePromptCommand = createCommand({
  type: 'ai.prompt.create',
  payload: z.object({
    name: z.string(),
    slug: z.string(),
    parameterSchema: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  response: promptClientModelSchema,
});

export const CreateVersionCommand = createCommand({
  type: 'ai.prompt.createVersion',
  payload: z.object({
    promptId: z.string(),
    template: z.string(),
    activate: z.boolean().optional(),
  }),
  response: promptClientModelSchema,
});

export const SetActiveVersionCommand = createCommand({
  type: 'ai.prompt.setActiveVersion',
  payload: z.object({
    promptId: z.string(),
    versionId: z.string(),
  }),
  response: z.void(),
});
```

- [ ] **Step 3: Create client errors and mediator interface**

```typescript
// src/business/domain/prompt/client/errors.ts

/** Base error for prompt client (mediator) operations. */
export class PromptClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class PromptNotFoundClientError extends PromptClientError {
  constructor(
    public readonly identifier: string,
    cause?: unknown,
  ) {
    super(`Prompt not found: ${identifier}`, { cause });
  }
}

export function isPromptNotFoundClientError(error: unknown): error is PromptNotFoundClientError {
  return error instanceof PromptNotFoundClientError;
}
```

```typescript
// src/business/domain/prompt/client/mediator.ts
import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { PromptClientModel, ResolvedPromptClient } from './schemas.js';
import {
  FindPromptBySlugQuery,
  ListPromptsQuery,
  ResolvePromptQuery,
  CreatePromptCommand,
  CreateVersionCommand,
  SetActiveVersionCommand,
} from './queries.js';

export interface IPromptMediator {
  findBySlug(query: InstanceType<typeof FindPromptBySlugQuery>): Promise<PromptClientModel>;
  list(query: InstanceType<typeof ListPromptsQuery>): Promise<PromptClientModel[]>;
  resolve(query: InstanceType<typeof ResolvePromptQuery>): Promise<ResolvedPromptClient>;
  create(command: InstanceType<typeof CreatePromptCommand>): Promise<PromptClientModel>;
  createVersion(command: InstanceType<typeof CreateVersionCommand>): Promise<PromptClientModel>;
  setActiveVersion(command: InstanceType<typeof SetActiveVersionCommand>): Promise<void>;
}

export const PROMPT_MEDIATOR = createMediatorToken<IPromptMediator>('PROMPT_MEDIATOR', {
  findBySlug: FindPromptBySlugQuery,
  list: ListPromptsQuery,
  resolve: ResolvePromptQuery,
  create: CreatePromptCommand,
  createVersion: CreateVersionCommand,
  setActiveVersion: SetActiveVersionCommand,
});
```

- [ ] **Step 4: Commit**

```bash
git add src/business/domain/prompt/client/
git commit -m "feat: add prompt mediator contracts"
```

---

## Chunk 5: Business Domain — Session + Conversation

### Task 13: Session business service

Follow the same pattern as Task 10-12 (errors, models, interface, implementation, tests, mediator contracts) for the session domain at `src/business/domain/session/`.

**Key differences from prompt:**

**Interface:**

```typescript
export interface ISessionService {
  start(input: StartSessionInput): Promise<Session>;
  pause(sessionId: string): Promise<void>;
  resume(sessionId: string): Promise<Session>;
  end(sessionId: string): Promise<void>;
  get(sessionId: string): Promise<Session>;
  list(filter: SessionFilter): Promise<SessionSummary[]>;
  getMessages(sessionId: string, pagination: Pagination): Promise<MessageList>;
  exportTranscript(sessionId: string, format: 'json' | 'text'): Promise<Transcript>;
}
```

**Dependencies:** Injects `ISessionRepository`, `IMastraMemory` (for thread creation and message retrieval).

**start():** Creates a Mastra thread via `IMastraMemory.createThread()`, then creates an `ai_sessions` row linking them.

**getMessages():** Loads the session to get `mastraThreadId`, then delegates to `IMastraMemory.getMessages()`.

**exportTranscript():** Fetches all messages, formats as JSON or plain text.

**Errors:** `SessionNotFoundError`, `SessionAlreadyEndedError`

**Mediator contracts:** `FindSessionByIdQuery`, `ListSessionsQuery`, `CreateSessionCommand`, `EndSessionCommand` in `src/business/domain/session/client/`

- [ ] **Step 1: Create errors and models**
- [ ] **Step 2: Create interface**
- [ ] **Step 3: Write tests (start, getMessages, end, exportTranscript)**
- [ ] **Step 4: Implement SessionService**
- [ ] **Step 5: Create mapper, mock factory, providers**
- [ ] **Step 6: Create mediator contracts (client/ folder)**
- [ ] **Step 7: Run tests, commit**

```bash
git add src/business/domain/session/
git commit -m "feat: add session business service with Mastra thread integration"
```

---

### Task 14: Conversation engine

**Files:**

- Create: `src/business/domain/conversation/conversation.interface.ts`
- Create: `src/business/domain/conversation/conversation.business.ts`
- Create: `src/business/domain/conversation/conversation.business.spec.ts`
- Create: `src/business/domain/conversation/conversation.model.ts`
- Create: `src/business/domain/conversation/conversation.error.ts`
- Create: `src/business/domain/conversation/conversation.providers.ts`
- Create: `src/business/domain/conversation/conversation.testing.ts`
- Create: `src/business/domain/conversation/client/` (mediator contracts)

**Key design points:**

**ConversationConfig (no Mastra types):**

```typescript
export interface ConversationConfig {
  readonly promptSlug: string;
  readonly promptParams: Record<string, unknown>;
  readonly userId: string;
  readonly tenantId?: string;
  readonly purpose: string;
  readonly model?: string;
  readonly outputSchema?: unknown;
}
```

**Conversation (runtime-only handle):**

```typescript
export interface Conversation {
  readonly id: string; // same as sessionId
  readonly sessionId: string;
  readonly promptSlug: string;
  readonly resolvedPrompt: string;
  readonly model: string;
}
```

**ConversationEngine dependencies:** `IMediator` (for prompt + session), `IMastraAgent`, `AiConfig`

**create():**

1. `mediator.send(new ResolvePromptQuery({ slug, params }))`
2. `mediator.send(new CreateSessionCommand({ userId, purpose, promptSlug }))`
3. Configure Mastra agent with resolved prompt
4. Store conversation handle in a `Map<string, ConversationState>`
5. Return `Conversation`

**send() / stream():**

1. Look up conversation handle from map
2. If missing, reconstruct from session (load session → re-resolve prompt → re-create agent)
3. Delegate to `IMastraAgent.generate()` or `IMastraAgent.stream()`

**Tests should cover:**

- `create()` calls mediator for prompt resolution and session creation
- `send()` delegates to Mastra agent
- `send()` reconstructs when handle is missing (multi-instance scenario)
- Error wrapping: `MastraAdapterError` → `ConversationSendError`

**Errors:** `ConversationNotFoundError`, `ConversationSendError`

- [ ] **Step 1: Create errors and models**
- [ ] **Step 2: Create interface**
- [ ] **Step 3: Write tests**
- [ ] **Step 4: Implement ConversationEngine**
- [ ] **Step 5: Create mock factory, providers**
- [ ] **Step 6: Create mediator contracts (client/ folder)**
- [ ] **Step 7: Run tests, commit**

```bash
git add src/business/domain/conversation/
git commit -m "feat: add conversation engine with prompt resolution and session orchestration"
```

---

### Task 15: Business layer providers bundle

**Files:**

- Create: `src/business/providers.ts`

```typescript
// src/business/providers.ts
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { mastraProviders } from './sdk/mastra/mastra.providers.js';
import { promptBusinessProviders } from './domain/prompt/prompt.providers.js';
import { sessionBusinessProviders } from './domain/session/session.providers.js';
import { conversationBusinessProviders } from './domain/conversation/conversation.providers.js';

export function aiBusinessProviders(): ProviderBundle {
  const mastra = mastraProviders();
  const prompt = promptBusinessProviders();
  const session = sessionBusinessProviders();
  const conversation = conversationBusinessProviders();

  return {
    providers: [
      ...mastra.providers,
      ...prompt.providers,
      ...session.providers,
      ...conversation.providers,
    ],
    exports: [...mastra.exports, ...prompt.exports, ...session.exports, ...conversation.exports],
  };
}
```

- [ ] **Step 1: Create providers bundle, commit**

```bash
git add src/business/providers.ts
git commit -m "feat: add business layer provider bundle"
```

---

## Chunk 6: App Layer

### Task 16: Prompt app domain (reference pattern)

**Files:**

- Create: `src/app/domain/prompt/prompt.router.ts`
- Create: `src/app/domain/prompt/prompt.service.ts`
- Create: `src/app/domain/prompt/prompt.dto.ts`
- Create: `src/app/domain/prompt/prompt.mapper.ts`
- Create: `src/app/domain/prompt/prompt.error.ts`
- Create: `src/app/domain/prompt/prompt.tokens.ts`
- Create: `src/app/domain/prompt/prompt.providers.ts`
- Create: `src/app/domain/prompt/prompt.module.ts`

**Middleware config type:**

```typescript
// src/app/domain/prompt/prompt.tokens.ts
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IMiddleware } from '@sanamyvn/foundation/http/middleware';

export interface PromptMiddlewareConfig {
  readonly create?: IMiddleware[];
  readonly list?: IMiddleware[];
  readonly getBySlug?: IMiddleware[];
  readonly update?: IMiddleware[];
  readonly createVersion?: IMiddleware[];
  readonly activateVersion?: IMiddleware[];
  readonly listVersions?: IMiddleware[];
}

export const PROMPT_MIDDLEWARE_CONFIG = createToken<PromptMiddlewareConfig>(
  'PROMPT_MIDDLEWARE_CONFIG',
);
```

**Router applies middleware per-route from config:**

```typescript
// src/app/domain/prompt/prompt.router.ts (key pattern)
class PromptRouter implements IRouter {
  readonly basePath = '/ai/prompts';

  constructor(
    private readonly service: PromptAppService,
    private readonly middlewareConfig: PromptMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .post('/')
      .middleware(...(this.middlewareConfig.create ?? []))
      .handle(async ({ body }) => this.service.create(body));

    app
      .get('/')
      .middleware(...(this.middlewareConfig.list ?? []))
      .handle(async ({ query }) => this.service.list(query));

    app
      .get('/:slug')
      .middleware(...(this.middlewareConfig.getBySlug ?? []))
      .handle(async ({ params }) => this.service.getBySlug(params.slug));

    app
      .put('/:slug')
      .middleware(...(this.middlewareConfig.update ?? []))
      .handle(async ({ params, body }) => this.service.update(params.slug, body));

    app
      .post('/:slug/versions')
      .middleware(...(this.middlewareConfig.createVersion ?? []))
      .handle(async ({ params, body }) => this.service.createVersion(params.slug, body));

    app
      .put('/:slug/versions/:id/activate')
      .middleware(...(this.middlewareConfig.activateVersion ?? []))
      .handle(async ({ params }) => this.service.activateVersion(params.slug, params.id));

    app
      .get('/:slug/versions')
      .middleware(...(this.middlewareConfig.listVersions ?? []))
      .handle(async ({ params }) => this.service.listVersions(params.slug));
  }
}
```

**App service maps business errors to HTTP errors:**

```typescript
// src/app/domain/prompt/prompt.service.ts (key pattern)
class PromptAppService {
  constructor(private readonly mediator: IMediator) {}

  async create(input: CreatePromptDto): Promise<PromptResponseDto> {
    try {
      const result = await this.mediator.send(new CreatePromptCommand(input));
      return toPromptResponseDto(result);
    } catch (error) {
      if (error instanceof PromptAlreadyExistsError) {
        throw new ConflictError(error.message, error);
      }
      throw error;
    }
  }

  async getBySlug(slug: string): Promise<PromptResponseDto> {
    try {
      const result = await this.mediator.send(new FindPromptBySlugQuery({ slug }));
      return toPromptResponseDto(result);
    } catch (error) {
      if (error instanceof PromptNotFoundClientError) {
        throw new NotFoundError(error.message, error);
      }
      throw error;
    }
  }
}
```

**Module with forRoot():**

```typescript
// src/app/domain/prompt/prompt.module.ts
import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import type { PromptMiddlewareConfig } from './prompt.tokens.js';

export interface PromptAppModuleOptions {
  middleware?: PromptMiddlewareConfig;
}

export class PromptAppModule extends Module {
  static forRoot(options: PromptAppModuleOptions = {}) {
    return {
      module: PromptAppModule,
      providers: [
        value(PROMPT_MIDDLEWARE_CONFIG, options.middleware ?? {}),
        // ... router, service providers
      ],
      exports: [],
    };
  }
}
```

- [ ] **Step 1: Create tokens and DTOs**
- [ ] **Step 2: Create error mappings**
- [ ] **Step 3: Create mapper (toPromptResponseDto)**
- [ ] **Step 4: Implement app service**
- [ ] **Step 5: Implement router**
- [ ] **Step 6: Create module with forRoot()**
- [ ] **Step 7: Create providers**
- [ ] **Step 8: Commit**

```bash
git add src/app/domain/prompt/
git commit -m "feat: add prompt app layer with per-route middleware config"
```

---

### Task 17: Session and conversation app domains

Follow the exact pattern from Task 16 for both domains:

**Session app domain** (`src/app/domain/session/`):

- Routes: `GET /ai/sessions`, `GET /ai/sessions/:id`, `GET /ai/sessions/:id/messages`, `GET /ai/sessions/:id/transcript`, `PUT /ai/sessions/:id/end`
- `SessionAppModule.forRoot({ middleware: SessionMiddlewareConfig })`
- Error mapping: `SessionNotFoundError` → `NotFoundError (404)`, `SessionAlreadyEndedError` → `ConflictError (409)`

**Conversation app domain** (`src/app/domain/conversation/`):

- Routes: `POST /ai/conversations`, `POST /ai/conversations/:id/messages`, `POST /ai/conversations/:id/messages/stream`
- `ConversationAppModule.forMonolith({ middleware })` / `.forStandalone({ middleware, promptServiceUrl, sessionServiceUrl })`
- Error mapping: `ConversationNotFoundError` → `NotFoundError (404)`, `ConversationSendError` → `InternalError (500)`

- [ ] **Step 1: Implement session app domain**
- [ ] **Step 2: Implement conversation app domain**
- [ ] **Step 3: Run tests, commit each separately**

---

### Task 18: Mediator client modules

**Files for each domain** (prompt-client, session-client, conversation-client) under `src/app/sdk/`:

Each client module contains:

- `{domain}-local.mediator.ts` — wraps business service in-process
- `{domain}-remote.mediator.ts` — HTTP calls to remote service
- `{domain}-client.module.ts` — `forMonolith()` / `forStandalone()`
- `{domain}.mapper.ts` — `toClientModelFromBusiness()`, `toClientModelFromApp()`

Follow the [mediator patterns](../architecture/mediator-patterns.md) exactly.

- [ ] **Step 1: Implement prompt-client (local + remote + module)**
- [ ] **Step 2: Implement session-client**
- [ ] **Step 3: Implement conversation-client**
- [ ] **Step 4: Commit each separately**

---

### Task 19: App layer providers and package.json exports

**Files:**

- Create: `src/app/providers.ts`
- Modify: `package.json` — add all exports

- [ ] **Step 1: Create app providers bundle**

- [ ] **Step 2: Add package.json exports map**

Map every public file following the foundation convention. Key exports:

```json
{
  "exports": {
    "./config": { "types": "...", "default": "..." },
    "./error": { "types": "...", "default": "..." },
    "./shared/tokens": { "types": "...", "default": "..." },

    "./repository/prompt": { "types": "...", "default": "..." },
    "./repository/prompt/schema": { "types": "...", "default": "..." },
    "./repository/prompt/providers": { "types": "...", "default": "..." },
    "./repository/prompt/testing": { "types": "...", "default": "..." },

    "./business/prompt": { "types": "...", "default": "..." },
    "./business/prompt/models": { "types": "...", "default": "..." },
    "./business/prompt/errors": { "types": "...", "default": "..." },
    "./business/prompt/providers": { "types": "...", "default": "..." },
    "./business/prompt/testing": { "types": "...", "default": "..." },
    "./business/prompt/client/mediator": { "types": "...", "default": "..." },
    "./business/prompt/client/queries": { "types": "...", "default": "..." },
    "./business/prompt/client/schemas": { "types": "...", "default": "..." },
    "./business/prompt/client/errors": { "types": "...", "default": "..." },

    "./app/prompt/module": { "types": "...", "default": "..." },
    "./app/prompt-client/module": { "types": "...", "default": "..." }
  }
}
```

Repeat pattern for session and conversation domains.

- [ ] **Step 3: Verify build**

```bash
pnpm run build
pnpm run check-types
```

- [ ] **Step 4: Commit**

```bash
git add package.json src/app/providers.ts
git commit -m "feat: add app layer providers and package.json exports"
```

---

## Chunk 7: Integration Tests

### Task 20: Integration test fixture

**Files:**

- Create: `src/__tests__/integration/fixture.ts`
- Create: `src/__tests__/integration/helpers.ts`
- Create: `tests/global-setup.ts`

Set up a PostgreSQL test fixture following the iam-ts pattern:

- Create isolated test schema
- Generate DDL from Drizzle schemas (`aiPrompts`, `aiPromptVersions`, `aiSessions`)
- Provide `truncateAll()` for test isolation
- `createAiTestContext()` wires real repos + mocked Mastra adapters

- [ ] **Step 1: Create global setup (Postgres container)**
- [ ] **Step 2: Create fixture (schema creation, truncation)**
- [ ] **Step 3: Create test context helper**
- [ ] **Step 4: Commit**

---

### Task 21: Integration tests — Prompt lifecycle

**Files:**

- Create: `src/__tests__/integration/prompt/prompt-crud.spec.ts`
- Create: `src/__tests__/integration/prompt/prompt-versioning.spec.ts`

**Test scenarios:**

- Create prompt → find by slug → update metadata
- Create version → activate → resolve with params
- Duplicate slug → `PromptAlreadyExistsError`
- Resolve with missing version → `PromptNotFoundError`
- Version rollback (activate older version)

- [ ] **Step 1: Write CRUD tests**
- [ ] **Step 2: Write versioning tests**
- [ ] **Step 3: Run tests, commit**

---

### Task 22: Integration tests — Session lifecycle

**Files:**

- Create: `src/__tests__/integration/session/session-lifecycle.spec.ts`

**Test scenarios:**

- Start session → creates Mastra thread + DB row
- Get messages → delegates to Mastra memory
- Pause → resume → end lifecycle
- End already-ended session → `SessionAlreadyEndedError`
- Export transcript (JSON and text formats)

- [ ] **Step 1: Write lifecycle tests**
- [ ] **Step 2: Run tests, commit**

---

### Task 23: Integration tests — Conversation engine

**Files:**

- Create: `src/__tests__/integration/conversation/conversation-flow.spec.ts`

**Test scenarios:**

- Create conversation → resolves prompt via mediator, creates session via mediator
- Send message → delegates to Mastra agent
- Reconstruct conversation when handle missing (simulate multi-instance)
- Error wrapping: Mastra failure → `ConversationSendError`

- [ ] **Step 1: Write conversation flow tests**
- [ ] **Step 2: Run tests, commit**

---

### Task 24: Final verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

- [ ] **Step 2: Run lint and type check**

```bash
pnpm run lint
pnpm run check-types
```

- [ ] **Step 3: Run build**

```bash
pnpm run build
```

- [ ] **Step 4: Verify all exports resolve**

```bash
node -e "import('@sanamyvn/ai/config')"
```

- [ ] **Step 5: Final commit if any remaining changes**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, build clean"
```
