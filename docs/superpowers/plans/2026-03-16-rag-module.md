# RAG Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a RAG domain vertical (ingest/delete/replace) to `@sanamyvn/ai-ts`, wrapping `@mastra/rag` and `@mastra/pg` behind stable interfaces following the existing adapter pattern.

**Architecture:** Extends the existing 3-layer architecture with an SDK adapter for PgVector, a business layer orchestrating the chunk-embed-store pipeline, and an app layer with REST routes and mediator clients. No repository layer — vector storage goes through the Mastra RAG adapter.

**Tech Stack:** TypeScript, `@mastra/rag` (MDocument/chunking), `@mastra/pg` (PgVector), `ai` SDK (embedMany), `@sanamyvn/foundation` (DI, mediator, HTTP), Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-rag-module-design.md`

**Spec deviations (following codebase convention over spec):**

- Spec says `RagAppModule.forRoot()` — implemented as `forMonolith()` / `forStandalone()` to match `ConversationAppModule` pattern
- Spec says `RagClientModule` class with static methods — implemented as `ragClientMonolithProviders()` / `ragClientStandaloneProviders()` functions to match `conversation-client.module.ts`

---

## File Map

### New files

| File                                             | Responsibility                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/business/sdk/mastra/adapters/mastra.rag.ts` | `MastraRagAdapter` — wraps PgVector behind `IMastraRag`                     |
| `src/business/domain/rag/rag.interface.ts`       | `IRagBusiness` interface + `RAG_BUSINESS` token                             |
| `src/business/domain/rag/rag.model.ts`           | Domain types: `RagContent`, `IngestInput`, `DeleteInput`, etc.              |
| `src/business/domain/rag/rag.error.ts`           | `RagBusinessError`, `RagIngestError`, `RagDeleteError`, `RagEmbeddingError` |
| `src/business/domain/rag/rag.business.ts`        | `RagBusiness` — orchestrates chunk→embed→store pipeline                     |
| `src/business/domain/rag/rag.business.spec.ts`   | Unit tests for `RagBusiness`                                                |
| `src/business/domain/rag/rag.providers.ts`       | `ragBusinessProviders()`                                                    |
| `src/business/domain/rag/rag.testing.ts`         | `createMockRagBusiness()`                                                   |
| `src/business/domain/rag/client/schemas.ts`      | Zod schemas for mediator payloads/responses                                 |
| `src/business/domain/rag/client/queries.ts`      | `RagIngestCommand`, `RagDeleteCommand`, `RagReplaceCommand`                 |
| `src/business/domain/rag/client/errors.ts`       | `RagClientError` hierarchy                                                  |
| `src/business/domain/rag/client/mediator.ts`     | `IRagMediator` + `RAG_MEDIATOR` token                                       |
| `src/app/domain/rag/rag.router.ts`               | REST routes: `/ai/rag/ingest`, `/ai/rag/documents`                          |
| `src/app/domain/rag/rag.service.ts`              | `RagAppService` — error mapping layer                                       |
| `src/app/domain/rag/rag.service.spec.ts`         | Unit tests for `RagAppService`                                              |
| `src/app/domain/rag/rag.dto.ts`                  | Zod request/response DTOs                                                   |
| `src/app/domain/rag/rag.mapper.ts`               | Business → DTO transformations                                              |
| `src/app/domain/rag/rag.error.ts`                | HTTP error classes + `mapRagError`                                          |
| `src/app/domain/rag/rag.tokens.ts`               | `RAG_MIDDLEWARE_CONFIG` DI token                                            |
| `src/app/domain/rag/rag.providers.ts`            | `ragAppProviders()`                                                         |
| `src/app/domain/rag/rag.module.ts`               | `RagAppModule.forMonolith()` / `forStandalone()`                            |
| `src/app/sdk/rag-client/rag-local.mediator.ts`   | In-process mediator wrapping `IRagBusiness`                                 |
| `src/app/sdk/rag-client/rag-remote.mediator.ts`  | HTTP-based mediator for standalone deployment                               |
| `src/app/sdk/rag-client/rag-client.module.ts`    | `ragClientMonolithProviders()` / `ragClientStandaloneProviders()`           |
| `src/app/sdk/rag-client/rag.mapper.ts`           | Business → client model mappers                                             |

### Modified files

| File                                          | Change                                                         |
| --------------------------------------------- | -------------------------------------------------------------- |
| `src/config.ts`                               | Add `embeddingModel`, `embeddingDimension` to `aiConfigSchema` |
| `src/business/sdk/mastra/mastra.interface.ts` | Add `IMastraRag`, `MASTRA_RAG`, `MASTRA_CORE_RAG`              |
| `src/business/sdk/mastra/mastra.providers.ts` | Add `bind(MASTRA_RAG, MastraRagAdapter)`                       |
| `src/business/sdk/mastra/mastra.testing.ts`   | Add `createMockMastraRag()`                                    |
| `src/business/providers.ts`                   | Add `ragBusinessProviders()` to composition                    |
| `src/app/providers.ts`                        | Add `ragAppProviders()` to composition                         |
| `package.json`                                | Add peer deps + exports for RAG domain                         |

---

## Chunk 1: Configuration + SDK Adapter Layer

### Task 1: Add embedding config to `aiConfigSchema`

**Files:**

- Modify: `src/config.ts`

- [ ] **Step 1: Add embedding fields to config schema**

In `src/config.ts`, add `embeddingModel` and `embeddingDimension` to the `aiConfigSchema`:

```typescript
export const aiConfigSchema = z.object({
  defaultModel: z.string().default('anthropic/claude-sonnet-4-20250514'),
  prompt: promptConfigSchema.default({ maxVersions: 50 }),
  session: sessionConfigSchema.default({ transcriptPageSize: 100 }),
  embeddingModel: z.string().default('openai/text-embedding-3-small'),
  embeddingDimension: z.number().int().positive().default(1536),
});
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS — `AiConfig` type now includes `embeddingModel: string` and `embeddingDimension: number`

- [ ] **Step 3: Run existing tests to ensure no regression**

Run: `pnpm run test:unit`
Expected: All existing tests pass

- [ ] **Step 4: Commit**

```bash
git add src/config.ts
git commit -m "feat(rag): add embeddingModel and embeddingDimension to aiConfigSchema"
```

---

### Task 2: Add `IMastraRag` interface and tokens

**Files:**

- Modify: `src/business/sdk/mastra/mastra.interface.ts`

- [ ] **Step 1: Add PgVector import and IMastraRag interface**

At the top of `mastra.interface.ts`, add the PgVector import alongside existing Mastra imports:

```typescript
import type { PgVector } from '@mastra/pg';
```

At the bottom of the file (after the existing `MASTRA_CORE_MEMORY` token), add:

```typescript
/** Abstraction over a Mastra vector store for RAG write-path operations. */
export interface IMastraRag {
  /**
   * Create a vector index if it does not already exist (idempotent).
   * @param indexName - The name of the vector index (typically a scope ID).
   * @param dimension - The embedding dimension (e.g. 1536 for text-embedding-3-small).
   * @throws {MastraAdapterError} When the underlying PgVector call fails.
   */
  createIndex(indexName: string, dimension: number): Promise<void>;

  /**
   * Upsert vectors with metadata into the specified index.
   * @param indexName - The target index name.
   * @param vectors - The embedding vectors to store.
   * @param metadata - Metadata for each vector (must match vectors array length).
   * @returns The number of vectors submitted.
   * @throws {MastraAdapterError} When the underlying PgVector call fails.
   */
  upsert(
    indexName: string,
    vectors: number[][],
    metadata: Record<string, unknown>[],
  ): Promise<number>;

  /**
   * Delete vectors matching the metadata filter from the specified index.
   * @param indexName - The target index name.
   * @param filter - Metadata filter to match vectors for deletion.
   * @returns The number of vectors deleted.
   * @throws {MastraAdapterError} When the underlying PgVector call fails.
   */
  delete(indexName: string, filter: Record<string, unknown>): Promise<number>;
}

/** DI token for the application-level Mastra RAG adapter — bound by the Mastra SDK module. */
export const MASTRA_RAG = createToken<IMastraRag>('MASTRA_RAG');

/** DI token for the raw PgVector instance — provided by the downstream app. */
export const MASTRA_CORE_RAG = createToken<PgVector>('MASTRA_CORE_RAG');
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/sdk/mastra/mastra.interface.ts
git commit -m "feat(rag): add IMastraRag interface and DI tokens"
```

---

### Task 3: Implement `MastraRagAdapter`

**Files:**

- Create: `src/business/sdk/mastra/adapters/mastra.rag.ts`

- [ ] **Step 1: Create the adapter file**

Create `src/business/sdk/mastra/adapters/mastra.rag.ts`:

```typescript
import type { PgVector } from '@mastra/pg';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_RAG } from '../mastra.interface.js';
import type { IMastraRag } from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/pg` PgVector instance behind the stable `IMastraRag` interface.
 * All exceptions from PgVector are caught here and re-thrown as `MastraAdapterError`
 * so callers never see raw Mastra errors.
 */
@Injectable()
export class MastraRagAdapter implements IMastraRag {
  constructor(@Inject(MASTRA_CORE_RAG) private readonly pgVector: PgVector) {}

  async createIndex(indexName: string, dimension: number): Promise<void> {
    try {
      await this.pgVector.createIndex(indexName, dimension);
    } catch (error) {
      throw new MastraAdapterError('createIndex', error);
    }
  }

  async upsert(
    indexName: string,
    vectors: number[][],
    metadata: Record<string, unknown>[],
  ): Promise<number> {
    try {
      await this.pgVector.upsert(indexName, vectors, metadata);
      return vectors.length;
    } catch (error) {
      throw new MastraAdapterError('upsert', error);
    }
  }

  async delete(indexName: string, filter: Record<string, unknown>): Promise<number> {
    try {
      return await this.pgVector.deleteVectors(indexName, filter);
    } catch (error) {
      throw new MastraAdapterError('delete', error);
    }
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/sdk/mastra/adapters/mastra.rag.ts
git commit -m "feat(rag): implement MastraRagAdapter wrapping PgVector"
```

---

### Task 4: Register adapter in providers and add mock

**Files:**

- Modify: `src/business/sdk/mastra/mastra.providers.ts`
- Modify: `src/business/sdk/mastra/mastra.testing.ts`

- [ ] **Step 1: Update mastraProviders() to include RAG adapter**

In `mastra.providers.ts`, add the import and binding:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { MASTRA_AGENT, MASTRA_MEMORY, MASTRA_RAG } from './mastra.interface.js';
import { MastraAgentAdapter } from './adapters/mastra.agent.js';
import { MastraMemoryAdapter } from './adapters/mastra.memory.js';
import { MastraRagAdapter } from './adapters/mastra.rag.js';

export function mastraProviders() {
  return {
    providers: [
      bind(MASTRA_AGENT, MastraAgentAdapter),
      bind(MASTRA_MEMORY, MastraMemoryAdapter),
      bind(MASTRA_RAG, MastraRagAdapter),
    ],
    exports: [MASTRA_AGENT, MASTRA_MEMORY, MASTRA_RAG],
  };
}
```

- [ ] **Step 2: Add createMockMastraRag() to testing file**

In `mastra.testing.ts`, add the import and mock factory:

```typescript
import type { IMastraAgent, IMastraMemory, IMastraRag } from './mastra.interface.js';
```

Then add at the bottom:

```typescript
/**
 * Creates a mock `IMastraRag` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub vector store operations without real PgVector.
 *
 * @example
 * const rag = createMockMastraRag();
 * rag.upsert.mockResolvedValue(5);
 */
export function createMockMastraRag() {
  return {
    createIndex: vi.fn<IMastraRag['createIndex']>(),
    upsert: vi.fn<IMastraRag['upsert']>(),
    delete: vi.fn<IMastraRag['delete']>(),
  };
}
```

- [ ] **Step 3: Verify types compile and existing tests pass**

Run: `pnpm run check-types && pnpm run test:unit`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/business/sdk/mastra/mastra.providers.ts src/business/sdk/mastra/mastra.testing.ts
git commit -m "feat(rag): register MastraRagAdapter in providers and add mock"
```

---

## Chunk 2: Business Layer — Models, Errors, Interface

### Task 5: Create RAG domain models

**Files:**

- Create: `src/business/domain/rag/rag.model.ts`

- [ ] **Step 1: Create the models file**

Create `src/business/domain/rag/rag.model.ts`:

```typescript
/** Content types matching MDocument factory methods. */
export interface RagContent {
  readonly type: 'text' | 'html' | 'markdown' | 'json';
  readonly data: string;
}

/** Per-document input for batch ingestion. */
export interface DocumentInput {
  readonly documentId: string;
  readonly content: RagContent;
}

/** Chunking options — overrides hardcoded defaults when provided. */
export interface ChunkOptions {
  readonly strategy?:
    | 'recursive'
    | 'character'
    | 'token'
    | 'markdown'
    | 'html'
    | 'json'
    | 'latex'
    | 'sentence'
    | 'semantic-markdown';
  readonly maxSize?: number;
  readonly overlap?: number;
}

/** Input for batch document ingestion into a scope. */
export interface IngestInput {
  readonly scopeId: string;
  readonly documents: DocumentInput[];
  readonly chunkOptions?: ChunkOptions;
}

/** Result of an ingest operation. */
export interface IngestResult {
  readonly chunksStored: number;
}

/** Input for deleting vectors by metadata filter within a scope. */
export interface DeleteInput {
  readonly scopeId: string;
  readonly filter: Record<string, unknown>;
}

/** Result of a delete operation. */
export interface DeleteResult {
  readonly chunksDeleted: number;
}

/** Input for replacing a document's vectors with new content. */
export interface ReplaceInput {
  readonly scopeId: string;
  readonly documentId: string;
  readonly content: RagContent;
  readonly chunkOptions?: ChunkOptions;
}

/** Result of a replace operation. */
export interface ReplaceResult {
  readonly chunksDeleted: number;
  readonly chunksStored: number;
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/rag/rag.model.ts
git commit -m "feat(rag): add RAG domain models"
```

---

### Task 6: Create RAG business errors

**Files:**

- Create: `src/business/domain/rag/rag.error.ts`

- [ ] **Step 1: Create the error file**

Create `src/business/domain/rag/rag.error.ts`:

```typescript
/** Base error for RAG business operations. */
export class RagBusinessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when the RAG ingest pipeline fails (chunking, embedding, or vector upsert). */
export class RagIngestError extends RagBusinessError {
  constructor(
    public readonly documentId: string,
    cause?: unknown,
  ) {
    super(`RAG ingestion failed for document: ${documentId}`, { cause });
  }
}

/** Thrown when deleting vectors from the store fails. */
export class RagDeleteError extends RagBusinessError {
  constructor(
    public readonly scopeId: string,
    cause?: unknown,
  ) {
    super(`RAG vector deletion failed in scope: ${scopeId}`, { cause });
  }
}

/** Thrown when embedding generation fails. */
export class RagEmbeddingError extends RagBusinessError {
  constructor(cause?: unknown) {
    super('Embedding generation failed', { cause });
  }
}

export function isRagIngestError(error: unknown): error is RagIngestError {
  return error instanceof RagIngestError;
}

export function isRagDeleteError(error: unknown): error is RagDeleteError {
  return error instanceof RagDeleteError;
}

/** Thrown when an unsupported content type is encountered. */
export class RagContentProcessingError extends RagBusinessError {
  constructor(
    public readonly contentType: string,
    cause?: unknown,
  ) {
    super(`Unsupported RAG content type: ${contentType}`, { cause });
  }
}

export function isRagEmbeddingError(error: unknown): error is RagEmbeddingError {
  return error instanceof RagEmbeddingError;
}

export function isRagContentProcessingError(error: unknown): error is RagContentProcessingError {
  return error instanceof RagContentProcessingError;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/business/domain/rag/rag.error.ts
git commit -m "feat(rag): add RAG business error hierarchy"
```

---

### Task 7: Create RAG business interface

**Files:**

- Create: `src/business/domain/rag/rag.interface.ts`

- [ ] **Step 1: Create the interface file**

Create `src/business/domain/rag/rag.interface.ts`:

```typescript
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  IngestInput,
  IngestResult,
  DeleteInput,
  DeleteResult,
  ReplaceInput,
  ReplaceResult,
} from './rag.model.js';

/** Orchestrates RAG write-path operations: ingest, delete, and replace. */
export interface IRagBusiness {
  /**
   * Ingest a batch of documents: chunk, embed, and store vectors.
   * @param input - Scope, documents, and optional chunk options.
   * @returns The total number of vector chunks stored.
   * @throws {RagIngestError} When the pipeline fails for any document.
   * @throws {RagEmbeddingError} When embedding generation fails.
   */
  ingest(input: IngestInput): Promise<IngestResult>;

  /**
   * Delete vectors matching a metadata filter within a scope.
   * @param input - Scope and metadata filter.
   * @returns The number of chunks deleted.
   * @throws {RagDeleteError} When the vector store delete operation fails.
   */
  delete(input: DeleteInput): Promise<DeleteResult>;

  /**
   * Replace a document's vectors: delete old vectors, then ingest new content.
   * Not transactionally atomic — if ingest fails after delete, old vectors are lost.
   * @param input - Scope, document ID, new content, and optional chunk options.
   * @returns Counts of deleted and stored chunks.
   * @throws {RagIngestError} When the ingest portion fails.
   * @throws {RagDeleteError} When the delete portion fails.
   */
  replace(input: ReplaceInput): Promise<ReplaceResult>;
}

/** Dependency-injection token for {@link IRagBusiness}. */
export const RAG_BUSINESS = createToken<IRagBusiness>('RAG_BUSINESS');
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/rag/rag.interface.ts
git commit -m "feat(rag): add IRagBusiness interface and DI token"
```

---

## Chunk 3: Business Layer — Implementation + Tests

### Task 8: Implement `RagBusiness`

**Files:**

- Create: `src/business/domain/rag/rag.business.ts`

- [ ] **Step 1: Create the business implementation**

Create `src/business/domain/rag/rag.business.ts`:

```typescript
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_RAG, type IMastraRag } from '@/business/sdk/mastra/mastra.interface.js';
import { isMastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import type { IRagBusiness } from './rag.interface.js';
import type {
  IngestInput,
  IngestResult,
  DeleteInput,
  DeleteResult,
  ReplaceInput,
  ReplaceResult,
  RagContent,
} from './rag.model.js';
import {
  RagIngestError,
  RagDeleteError,
  RagEmbeddingError,
  RagContentProcessingError,
} from './rag.error.js';

const DEFAULT_CHUNK_STRATEGY = 'recursive' as const;
const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_CHUNK_OVERLAP = 50;
const DEFAULT_EMBEDDING_BATCH_SIZE = 100;

@Injectable()
export class RagBusiness implements IRagBusiness {
  private readonly embeddingModel: ModelRouterEmbeddingModel;

  constructor(
    @Inject(MASTRA_RAG) private readonly mastraRag: IMastraRag,
    @Inject(AI_CONFIG) private readonly config: AiConfig,
  ) {
    this.embeddingModel = new ModelRouterEmbeddingModel(this.config.embeddingModel);
  }

  async ingest(input: IngestInput): Promise<IngestResult> {
    try {
      await this.mastraRag.createIndex(input.scopeId, this.config.embeddingDimension);
    } catch (error) {
      if (isMastraAdapterError(error)) {
        throw new RagIngestError(input.documents[0]?.documentId ?? 'unknown', error);
      }
      throw error;
    }

    let totalChunks = 0;

    for (const doc of input.documents) {
      try {
        const mdoc = this.createDocument(doc.content, {
          documentId: doc.documentId,
          scopeId: input.scopeId,
        });

        const chunks = await mdoc.chunk({
          strategy: input.chunkOptions?.strategy ?? DEFAULT_CHUNK_STRATEGY,
          size: input.chunkOptions?.maxSize ?? DEFAULT_CHUNK_SIZE,
          overlap: input.chunkOptions?.overlap ?? DEFAULT_CHUNK_OVERLAP,
        });

        const texts = chunks.map((c) => c.text);
        const embeddings = await this.embedBatched(texts);

        const stored = await this.mastraRag.upsert(
          input.scopeId,
          embeddings,
          chunks.map((c) => ({ text: c.text, documentId: doc.documentId, scopeId: input.scopeId })),
        );

        totalChunks += stored;
      } catch (error) {
        if (error instanceof RagEmbeddingError) {
          throw new RagIngestError(doc.documentId, error);
        }
        if (isMastraAdapterError(error)) {
          throw new RagIngestError(doc.documentId, error);
        }
        throw error;
      }
    }

    return { chunksStored: totalChunks };
  }

  async delete(input: DeleteInput): Promise<DeleteResult> {
    try {
      const chunksDeleted = await this.mastraRag.delete(input.scopeId, input.filter);
      return { chunksDeleted };
    } catch (error) {
      if (isMastraAdapterError(error)) {
        throw new RagDeleteError(input.scopeId, error);
      }
      throw error;
    }
  }

  async replace(input: ReplaceInput): Promise<ReplaceResult> {
    const { chunksDeleted } = await this.delete({
      scopeId: input.scopeId,
      filter: { documentId: input.documentId },
    });

    const { chunksStored } = await this.ingest({
      scopeId: input.scopeId,
      documents: [{ documentId: input.documentId, content: input.content }],
      chunkOptions: input.chunkOptions,
    });

    return { chunksDeleted, chunksStored };
  }

  private createDocument(content: RagContent, metadata: Record<string, unknown>): MDocument {
    switch (content.type) {
      case 'text':
        return MDocument.fromText(content.data, metadata);
      case 'html':
        return MDocument.fromHTML(content.data, metadata);
      case 'markdown':
        return MDocument.fromMarkdown(content.data, metadata);
      case 'json':
        return MDocument.fromJSON(content.data, metadata);
      default:
        throw new RagContentProcessingError(content.type);
    }
  }

  private async embedBatched(texts: string[]): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += DEFAULT_EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + DEFAULT_EMBEDDING_BATCH_SIZE);
      try {
        const { embeddings } = await embedMany({
          model: this.embeddingModel,
          values: batch,
        });
        allEmbeddings.push(...embeddings);
      } catch (error) {
        throw new RagEmbeddingError(error);
      }
    }

    return allEmbeddings;
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/rag/rag.business.ts
git commit -m "feat(rag): implement RagBusiness with chunk-embed-store pipeline"
```

---

### Task 9: Write unit tests for `RagBusiness`

**Files:**

- Create: `src/business/domain/rag/rag.business.spec.ts`

Reference existing test pattern: `src/business/domain/conversation/conversation.business.spec.ts`

- [ ] **Step 1: Create test file**

Create `src/business/domain/rag/rag.business.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagBusiness } from './rag.business.js';
import { RagIngestError, RagDeleteError } from './rag.error.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { createMockMastraRag } from '@/business/sdk/mastra/mastra.testing.js';
import type { AiConfig } from '@/config.js';
import type { IngestInput, DeleteInput, ReplaceInput } from './rag.model.js';

// Mock @mastra/rag
vi.mock('@mastra/rag', () => ({
  MDocument: {
    fromText: vi.fn().mockReturnValue({
      chunk: vi.fn().mockResolvedValue([{ text: 'chunk-1' }, { text: 'chunk-2' }]),
    }),
    fromHTML: vi.fn().mockReturnValue({
      chunk: vi.fn().mockResolvedValue([{ text: 'html-chunk' }]),
    }),
    fromMarkdown: vi.fn().mockReturnValue({
      chunk: vi.fn().mockResolvedValue([{ text: 'md-chunk' }]),
    }),
    fromJSON: vi.fn().mockReturnValue({
      chunk: vi.fn().mockResolvedValue([{ text: 'json-chunk' }]),
    }),
  },
}));

// Mock ai SDK
vi.mock('ai', () => ({
  embedMany: vi.fn().mockResolvedValue({
    embeddings: [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
  }),
}));

// Mock @mastra/core/llm
vi.mock('@mastra/core/llm', () => ({
  ModelRouterEmbeddingModel: class MockModelRouterEmbeddingModel {},
}));

const SCOPE_ID = '11111111-1111-4111-a111-111111111111';
const DOC_ID = '22222222-2222-4222-a222-222222222222';

const config: AiConfig = {
  defaultModel: 'anthropic/claude-sonnet-4-20250514',
  prompt: { maxVersions: 50 },
  session: { transcriptPageSize: 100 },
  embeddingModel: 'openai/text-embedding-3-small',
  embeddingDimension: 1536,
};

describe('RagBusiness', () => {
  let mastraRag: ReturnType<typeof createMockMastraRag>;
  let business: RagBusiness;

  beforeEach(() => {
    vi.clearAllMocks();
    mastraRag = createMockMastraRag();
    mastraRag.createIndex.mockResolvedValue(undefined);
    mastraRag.upsert.mockResolvedValue(2);
    mastraRag.delete.mockResolvedValue(3);
    business = new RagBusiness(mastraRag, config);
  });

  describe('ingest', () => {
    const input: IngestInput = {
      scopeId: SCOPE_ID,
      documents: [{ documentId: DOC_ID, content: { type: 'text', data: 'hello world' } }],
    };

    it('creates index, chunks, embeds, and upserts', async () => {
      const result = await business.ingest(input);

      expect(mastraRag.createIndex).toHaveBeenCalledWith(SCOPE_ID, 1536);
      expect(mastraRag.upsert).toHaveBeenCalledWith(
        SCOPE_ID,
        [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        expect.arrayContaining([
          expect.objectContaining({ documentId: DOC_ID, scopeId: SCOPE_ID }),
        ]),
      );
      expect(result).toEqual({ chunksStored: 2 });
    });

    it('wraps MastraAdapterError during upsert as RagIngestError', async () => {
      mastraRag.upsert.mockRejectedValueOnce(
        new MastraAdapterError('upsert', new Error('pg error')),
      );

      await expect(business.ingest(input)).rejects.toThrow(RagIngestError);
    });

    it('wraps embedding failure as RagIngestError', async () => {
      const { embedMany } = await import('ai');
      vi.mocked(embedMany).mockRejectedValueOnce(new Error('rate limit'));

      await expect(business.ingest(input)).rejects.toThrow(RagIngestError);
    });

    it('supports html content type', async () => {
      const htmlInput: IngestInput = {
        scopeId: SCOPE_ID,
        documents: [{ documentId: DOC_ID, content: { type: 'html', data: '<p>hi</p>' } }],
      };

      const { MDocument } = await import('@mastra/rag');
      await business.ingest(htmlInput);
      expect(MDocument.fromHTML).toHaveBeenCalledWith('<p>hi</p>', expect.any(Object));
    });
  });

  describe('delete', () => {
    const input: DeleteInput = {
      scopeId: SCOPE_ID,
      filter: { documentId: DOC_ID },
    };

    it('deletes vectors by filter and returns count', async () => {
      const result = await business.delete(input);

      expect(mastraRag.delete).toHaveBeenCalledWith(SCOPE_ID, { documentId: DOC_ID });
      expect(result).toEqual({ chunksDeleted: 3 });
    });

    it('wraps MastraAdapterError as RagDeleteError', async () => {
      mastraRag.delete.mockRejectedValueOnce(
        new MastraAdapterError('delete', new Error('pg error')),
      );

      await expect(business.delete(input)).rejects.toThrow(RagDeleteError);
    });
  });

  describe('replace', () => {
    const input: ReplaceInput = {
      scopeId: SCOPE_ID,
      documentId: DOC_ID,
      content: { type: 'text', data: 'updated content' },
    };

    it('deletes then ingests and returns both counts', async () => {
      const result = await business.replace(input);

      expect(mastraRag.delete).toHaveBeenCalledWith(SCOPE_ID, { documentId: DOC_ID });
      expect(mastraRag.upsert).toHaveBeenCalled();
      expect(result).toEqual({ chunksDeleted: 3, chunksStored: 2 });
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm run test:unit -- src/business/domain/rag/rag.business.spec.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/business/domain/rag/rag.business.spec.ts
git commit -m "test(rag): add unit tests for RagBusiness"
```

---

### Task 10: Create RAG business providers and testing mock

**Files:**

- Create: `src/business/domain/rag/rag.providers.ts`
- Create: `src/business/domain/rag/rag.testing.ts`
- Modify: `src/business/providers.ts`

- [ ] **Step 1: Create providers file**

Create `src/business/domain/rag/rag.providers.ts`:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { RAG_BUSINESS } from './rag.interface.js';
import { RagBusiness } from './rag.business.js';

/**
 * Returns the DI provider bindings for the RAG business domain.
 * Include this in your module's provider list to make `RAG_BUSINESS`
 * injectable throughout the business layer.
 */
export function ragBusinessProviders() {
  return {
    providers: [bind(RAG_BUSINESS, RagBusiness)],
    exports: [RAG_BUSINESS],
  };
}
```

- [ ] **Step 2: Create testing mock file**

Create `src/business/domain/rag/rag.testing.ts`:

```typescript
import { vi } from 'vitest';
import type { IRagBusiness } from './rag.interface.js';

/**
 * Creates a mock `IRagBusiness` with all methods stubbed via `vi.fn()`.
 * Use in unit tests to stub RAG business behavior without real infrastructure.
 *
 * @example
 * const rag = createMockRagBusiness();
 * rag.ingest.mockResolvedValue({ chunksStored: 5 });
 */
export function createMockRagBusiness() {
  return {
    ingest: vi.fn<IRagBusiness['ingest']>(),
    delete: vi.fn<IRagBusiness['delete']>(),
    replace: vi.fn<IRagBusiness['replace']>(),
  };
}
```

- [ ] **Step 3: Add ragBusinessProviders to business composition**

In `src/business/providers.ts`, add the import and include in the composition:

```typescript
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { mastraProviders } from './sdk/mastra/mastra.providers.js';
import { promptBusinessProviders } from './domain/prompt/prompt.providers.js';
import { sessionBusinessProviders } from './domain/session/session.providers.js';
import { conversationBusinessProviders } from './domain/conversation/conversation.providers.js';
import { ragBusinessProviders } from './domain/rag/rag.providers.js';

export function aiBusinessProviders(): ProviderBundle {
  const mastra = mastraProviders();
  const prompt = promptBusinessProviders();
  const session = sessionBusinessProviders();
  const conversation = conversationBusinessProviders();
  const rag = ragBusinessProviders();

  return {
    providers: [
      ...mastra.providers,
      ...prompt.providers,
      ...session.providers,
      ...conversation.providers,
      ...rag.providers,
    ],
    exports: [
      ...mastra.exports,
      ...prompt.exports,
      ...session.exports,
      ...conversation.exports,
      ...rag.exports,
    ],
  };
}
```

- [ ] **Step 4: Verify types compile and all tests pass**

Run: `pnpm run check-types && pnpm run test:unit`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/business/domain/rag/rag.providers.ts src/business/domain/rag/rag.testing.ts src/business/providers.ts
git commit -m "feat(rag): add RAG business providers, testing mock, and composition"
```

---

## Chunk 4: Business Layer — Client Mediator Contracts

### Task 11: Create RAG client schemas

**Files:**

- Create: `src/business/domain/rag/client/schemas.ts`

- [ ] **Step 1: Create client schemas**

Create `src/business/domain/rag/client/schemas.ts`:

```typescript
import { z } from 'zod';

const ragContentSchema = z.object({
  type: z.enum(['text', 'html', 'markdown', 'json']),
  data: z.string(),
});

const chunkOptionsSchema = z.object({
  strategy: z
    .enum([
      'recursive',
      'character',
      'token',
      'markdown',
      'html',
      'json',
      'latex',
      'sentence',
      'semantic-markdown',
    ])
    .optional(),
  maxSize: z.number().positive().optional(),
  overlap: z.number().nonnegative().optional(),
});

const documentInputSchema = z.object({
  documentId: z.string(),
  content: ragContentSchema,
});

export const ingestClientSchema = z.object({
  scopeId: z.string(),
  documents: z.array(documentInputSchema).min(1),
  chunkOptions: chunkOptionsSchema.optional(),
});

export type IngestClientInput = z.infer<typeof ingestClientSchema>;

export const deleteClientSchema = z.object({
  scopeId: z.string(),
  filter: z.record(z.unknown()),
});

export type DeleteClientInput = z.infer<typeof deleteClientSchema>;

export const replaceClientSchema = z.object({
  scopeId: z.string(),
  documentId: z.string(),
  content: ragContentSchema,
  chunkOptions: chunkOptionsSchema.optional(),
});

export type ReplaceClientInput = z.infer<typeof replaceClientSchema>;

export const ingestResultSchema = z.object({
  chunksStored: z.number(),
});

export type IngestClientResult = z.infer<typeof ingestResultSchema>;

export const deleteResultSchema = z.object({
  chunksDeleted: z.number(),
});

export type DeleteClientResult = z.infer<typeof deleteResultSchema>;

export const replaceResultSchema = z.object({
  chunksDeleted: z.number(),
  chunksStored: z.number(),
});

export type ReplaceClientResult = z.infer<typeof replaceResultSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/business/domain/rag/client/schemas.ts
git commit -m "feat(rag): add RAG client Zod schemas"
```

---

### Task 12: Create RAG client queries, errors, and mediator

**Files:**

- Create: `src/business/domain/rag/client/queries.ts`
- Create: `src/business/domain/rag/client/errors.ts`
- Create: `src/business/domain/rag/client/mediator.ts`

- [ ] **Step 1: Create client queries**

Create `src/business/domain/rag/client/queries.ts`:

```typescript
import { createCommand } from '@sanamyvn/foundation/mediator/request';
import {
  ingestClientSchema,
  deleteClientSchema,
  replaceClientSchema,
  ingestResultSchema,
  deleteResultSchema,
  replaceResultSchema,
} from './schemas.js';

export const RagIngestCommand = createCommand({
  type: 'ai.rag.ingest',
  payload: ingestClientSchema,
  response: ingestResultSchema,
});

export const RagDeleteCommand = createCommand({
  type: 'ai.rag.delete',
  payload: deleteClientSchema,
  response: deleteResultSchema,
});

export const RagReplaceCommand = createCommand({
  type: 'ai.rag.replace',
  payload: replaceClientSchema,
  response: replaceResultSchema,
});
```

- [ ] **Step 2: Create client errors**

Create `src/business/domain/rag/client/errors.ts`:

```typescript
/** Base error for RAG client (mediator) operations. */
export class RagClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when a RAG ingest operation fails through the mediator. */
export class RagIngestClientError extends RagClientError {
  constructor(cause?: unknown) {
    super('RAG ingest failed', { cause });
  }
}

/** Thrown when a RAG delete operation fails through the mediator. */
export class RagDeleteClientError extends RagClientError {
  constructor(cause?: unknown) {
    super('RAG delete failed', { cause });
  }
}

export function isRagIngestClientError(error: unknown): error is RagIngestClientError {
  return error instanceof RagIngestClientError;
}

export function isRagDeleteClientError(error: unknown): error is RagDeleteClientError {
  return error instanceof RagDeleteClientError;
}
```

- [ ] **Step 3: Create client mediator**

Create `src/business/domain/rag/client/mediator.ts`:

```typescript
import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { IngestClientResult, DeleteClientResult, ReplaceClientResult } from './schemas.js';
import { RagIngestCommand, RagDeleteCommand, RagReplaceCommand } from './queries.js';

export interface IRagMediator {
  ingest(command: InstanceType<typeof RagIngestCommand>): Promise<IngestClientResult>;
  delete(command: InstanceType<typeof RagDeleteCommand>): Promise<DeleteClientResult>;
  replace(command: InstanceType<typeof RagReplaceCommand>): Promise<ReplaceClientResult>;
}

export const RAG_MEDIATOR = createMediatorToken<IRagMediator>('RAG_MEDIATOR', {
  ingest: RagIngestCommand,
  delete: RagDeleteCommand,
  replace: RagReplaceCommand,
});
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/business/domain/rag/client/
git commit -m "feat(rag): add RAG client mediator contracts"
```

---

## Chunk 5: App Layer — DTOs, Errors, Service, Router

### Task 13: Create RAG app DTOs

**Files:**

- Create: `src/app/domain/rag/rag.dto.ts`

- [ ] **Step 1: Create DTO file**

Create `src/app/domain/rag/rag.dto.ts`:

```typescript
import { z } from 'zod';

const ragContentDto = z.object({
  type: z.enum(['text', 'html', 'markdown', 'json']),
  data: z.string().min(1),
});

const chunkOptionsDto = z.object({
  strategy: z
    .enum([
      'recursive',
      'character',
      'token',
      'markdown',
      'html',
      'json',
      'latex',
      'sentence',
      'semantic-markdown',
    ])
    .optional(),
  maxSize: z.number().positive().optional(),
  overlap: z.number().nonnegative().optional(),
});

export const ingestRequestDto = z.object({
  scopeId: z.string().check(z.uuid()),
  documents: z
    .array(
      z.object({
        documentId: z.string().check(z.uuid()),
        content: ragContentDto,
      }),
    )
    .min(1),
  chunkOptions: chunkOptionsDto.optional(),
});
export type IngestRequestDto = z.infer<typeof ingestRequestDto>;

export const ingestResponseDto = z.object({
  chunksStored: z.number().nonnegative(),
});
export type IngestResponseDto = z.infer<typeof ingestResponseDto>;

export const deleteRequestDto = z.object({
  scopeId: z.string().check(z.uuid()),
  filter: z.record(z.unknown()),
});
export type DeleteRequestDto = z.infer<typeof deleteRequestDto>;

export const deleteResponseDto = z.object({
  chunksDeleted: z.number().nonnegative(),
});
export type DeleteResponseDto = z.infer<typeof deleteResponseDto>;

export const replaceParamsDto = z.object({
  documentId: z.string().check(z.uuid()),
});

export const replaceRequestDto = z.object({
  scopeId: z.string().check(z.uuid()),
  content: ragContentDto,
  chunkOptions: chunkOptionsDto.optional(),
});
export type ReplaceRequestDto = z.infer<typeof replaceRequestDto>;

export const replaceResponseDto = z.object({
  chunksDeleted: z.number().nonnegative(),
  chunksStored: z.number().nonnegative(),
});
export type ReplaceResponseDto = z.infer<typeof replaceResponseDto>;
```

- [ ] **Step 2: Commit**

```bash
git add src/app/domain/rag/rag.dto.ts
git commit -m "feat(rag): add RAG app DTOs"
```

---

### Task 14: Create RAG app tokens, errors, mapper

**Files:**

- Create: `src/app/domain/rag/rag.tokens.ts`
- Create: `src/app/domain/rag/rag.error.ts`
- Create: `src/app/domain/rag/rag.mapper.ts`

- [ ] **Step 1: Create tokens file**

Create `src/app/domain/rag/rag.tokens.ts`:

```typescript
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { MiddlewareInput } from '@sanamyvn/foundation/http/types';

export interface RagMiddlewareConfig {
  readonly ingest?: MiddlewareInput[];
  readonly delete?: MiddlewareInput[];
  readonly replace?: MiddlewareInput[];
}

export const RAG_MIDDLEWARE_CONFIG = createToken<RagMiddlewareConfig>('RAG_MIDDLEWARE_CONFIG');
```

- [ ] **Step 2: Create error file**

Create `src/app/domain/rag/rag.error.ts`:

```typescript
import {
  isRagIngestError,
  isRagDeleteError,
  isRagEmbeddingError,
} from '@/business/domain/rag/rag.error.js';
import {
  isRagIngestClientError,
  isRagDeleteClientError,
} from '@/business/domain/rag/client/errors.js';

export class RagHttpIngestError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export class RagHttpDeleteError extends Error {
  readonly statusCode = 500;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

export function mapRagError(error: unknown): never {
  if (isRagIngestError(error) || isRagIngestClientError(error)) {
    throw new RagHttpIngestError(error.message, error);
  }
  if (isRagEmbeddingError(error)) {
    throw new RagHttpIngestError(error.message, error);
  }
  if (isRagDeleteError(error) || isRagDeleteClientError(error)) {
    throw new RagHttpDeleteError(error.message, error);
  }
  throw error;
}
```

- [ ] **Step 3: Create mapper file**

Create `src/app/domain/rag/rag.mapper.ts`:

```typescript
import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
} from '@/business/domain/rag/client/schemas.js';
import type { IngestResponseDto, DeleteResponseDto, ReplaceResponseDto } from './rag.dto.js';

export function toIngestResponseDto(result: IngestClientResult): IngestResponseDto {
  return { chunksStored: result.chunksStored };
}

export function toDeleteResponseDto(result: DeleteClientResult): DeleteResponseDto {
  return { chunksDeleted: result.chunksDeleted };
}

export function toReplaceResponseDto(result: ReplaceClientResult): ReplaceResponseDto {
  return { chunksDeleted: result.chunksDeleted, chunksStored: result.chunksStored };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/domain/rag/rag.tokens.ts src/app/domain/rag/rag.error.ts src/app/domain/rag/rag.mapper.ts
git commit -m "feat(rag): add RAG app tokens, error mapping, and mapper"
```

---

### Task 15: Create RAG app service

**Files:**

- Create: `src/app/domain/rag/rag.service.ts`

- [ ] **Step 1: Create service file**

Create `src/app/domain/rag/rag.service.ts`:

```typescript
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import {
  RagIngestCommand,
  RagDeleteCommand,
  RagReplaceCommand,
} from '@/business/domain/rag/client/queries.js';
import { mapRagError } from './rag.error.js';
import { toIngestResponseDto, toDeleteResponseDto, toReplaceResponseDto } from './rag.mapper.js';
import type {
  IngestRequestDto,
  IngestResponseDto,
  DeleteRequestDto,
  DeleteResponseDto,
  ReplaceRequestDto,
  ReplaceResponseDto,
} from './rag.dto.js';

@Injectable()
export class RagAppService {
  constructor(@Inject(AI_MEDIATOR) private readonly mediator: IMediator) {}

  async ingest(input: IngestRequestDto): Promise<IngestResponseDto> {
    try {
      const result = await this.mediator.send(new RagIngestCommand(input));
      return toIngestResponseDto(result);
    } catch (error) {
      mapRagError(error);
    }
  }

  async delete(input: DeleteRequestDto): Promise<DeleteResponseDto> {
    try {
      const result = await this.mediator.send(new RagDeleteCommand(input));
      return toDeleteResponseDto(result);
    } catch (error) {
      mapRagError(error);
    }
  }

  async replace(documentId: string, input: ReplaceRequestDto): Promise<ReplaceResponseDto> {
    try {
      const result = await this.mediator.send(
        new RagReplaceCommand({
          scopeId: input.scopeId,
          documentId,
          content: input.content,
          chunkOptions: input.chunkOptions,
        }),
      );
      return toReplaceResponseDto(result);
    } catch (error) {
      mapRagError(error);
    }
  }
}

export const RAG_APP_SERVICE = createToken<RagAppService>('RAG_APP_SERVICE');
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/domain/rag/rag.service.ts
git commit -m "feat(rag): add RAG app service with error mapping"
```

---

### Task 16: Write unit tests for `RagAppService`

**Files:**

- Create: `src/app/domain/rag/rag.service.spec.ts`

- [ ] **Step 1: Create test file**

Create `src/app/domain/rag/rag.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagAppService } from './rag.service.js';
import { RagHttpIngestError, RagHttpDeleteError } from './rag.error.js';
import { RagIngestError, RagDeleteError } from '@/business/domain/rag/rag.error.js';

const SCOPE_ID = '11111111-1111-4111-a111-111111111111';
const DOC_ID = '22222222-2222-4222-a222-222222222222';

describe('RagAppService', () => {
  let mediator: { send: ReturnType<typeof vi.fn> };
  let service: RagAppService;

  beforeEach(() => {
    mediator = { send: vi.fn() };
    service = new RagAppService(mediator as never);
  });

  describe('ingest', () => {
    it('returns chunksStored on success', async () => {
      mediator.send.mockResolvedValueOnce({ chunksStored: 5 });

      const result = await service.ingest({
        scopeId: SCOPE_ID,
        documents: [{ documentId: DOC_ID, content: { type: 'text', data: 'hello' } }],
      });

      expect(result).toEqual({ chunksStored: 5 });
    });

    it('maps RagIngestError to RagHttpIngestError', async () => {
      mediator.send.mockRejectedValueOnce(new RagIngestError(DOC_ID));

      await expect(
        service.ingest({
          scopeId: SCOPE_ID,
          documents: [{ documentId: DOC_ID, content: { type: 'text', data: 'hello' } }],
        }),
      ).rejects.toThrow(RagHttpIngestError);
    });
  });

  describe('delete', () => {
    it('returns chunksDeleted on success', async () => {
      mediator.send.mockResolvedValueOnce({ chunksDeleted: 3 });

      const result = await service.delete({ scopeId: SCOPE_ID, filter: { documentId: DOC_ID } });

      expect(result).toEqual({ chunksDeleted: 3 });
    });

    it('maps RagDeleteError to RagHttpDeleteError', async () => {
      mediator.send.mockRejectedValueOnce(new RagDeleteError(SCOPE_ID));

      await expect(
        service.delete({ scopeId: SCOPE_ID, filter: { documentId: DOC_ID } }),
      ).rejects.toThrow(RagHttpDeleteError);
    });
  });

  describe('replace', () => {
    it('returns both counts on success', async () => {
      mediator.send.mockResolvedValueOnce({ chunksDeleted: 3, chunksStored: 7 });

      const result = await service.replace(DOC_ID, {
        scopeId: SCOPE_ID,
        content: { type: 'text', data: 'updated' },
      });

      expect(result).toEqual({ chunksDeleted: 3, chunksStored: 7 });
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm run test:unit -- src/app/domain/rag/rag.service.spec.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/app/domain/rag/rag.service.spec.ts
git commit -m "test(rag): add unit tests for RagAppService"
```

---

### Task 17: Create RAG router

**Files:**

- Create: `src/app/domain/rag/rag.router.ts`

- [ ] **Step 1: Create router file**

Create `src/app/domain/rag/rag.router.ts`:

```typescript
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import {
  ingestRequestDto,
  ingestResponseDto,
  deleteRequestDto,
  deleteResponseDto,
  replaceParamsDto,
  replaceRequestDto,
  replaceResponseDto,
} from './rag.dto.js';
import { RAG_APP_SERVICE, type RagAppService } from './rag.service.js';
import { RAG_MIDDLEWARE_CONFIG, type RagMiddlewareConfig } from './rag.tokens.js';

@Injectable()
export class RagRouter implements IRouter {
  readonly basePath = '/ai/rag';

  constructor(
    @Inject(RAG_APP_SERVICE) private readonly service: RagAppService,
    @Inject(RAG_MIDDLEWARE_CONFIG) private readonly middlewareConfig: RagMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .post('/ingest')
      .middleware(...(this.middlewareConfig.ingest ?? []))
      .schema({ body: ingestRequestDto, response: ingestResponseDto })
      .handle(async ({ body }) => this.service.ingest(body));

    app
      .delete('/documents')
      .middleware(...(this.middlewareConfig.delete ?? []))
      .schema({ body: deleteRequestDto, response: deleteResponseDto })
      .handle(async ({ body }) => this.service.delete(body));

    app
      .put('/documents/:documentId')
      .middleware(...(this.middlewareConfig.replace ?? []))
      .schema({ params: replaceParamsDto, body: replaceRequestDto, response: replaceResponseDto })
      .handle(async ({ params, body }) => this.service.replace(params.documentId, body));
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/domain/rag/rag.router.ts
git commit -m "feat(rag): add RAG REST router"
```

---

## Chunk 6: App Layer — Module, Providers, Client SDK

### Task 18: Create RAG app providers and module

**Files:**

- Create: `src/app/domain/rag/rag.providers.ts`
- Create: `src/app/domain/rag/rag.module.ts`
- Modify: `src/app/providers.ts`

- [ ] **Step 1: Create app providers**

Create `src/app/domain/rag/rag.providers.ts`:

```typescript
import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { RAG_APP_SERVICE, RagAppService } from './rag.service.js';

export function ragAppProviders(): ProviderBundle {
  return {
    providers: [bind(RAG_APP_SERVICE, RagAppService)],
    exports: [RAG_APP_SERVICE],
  };
}
```

- [ ] **Step 2: Create app module**

Create `src/app/domain/rag/rag.module.ts`:

```typescript
import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { RAG_MIDDLEWARE_CONFIG } from './rag.tokens.js';
import type { RagMiddlewareConfig } from './rag.tokens.js';
import type { ModuleDefinition } from '@sanamyvn/foundation/di/node/module';

export interface RagAppModuleOptions {
  middleware?: RagMiddlewareConfig;
}

export class RagAppModule extends Module {
  exports = [];

  static forMonolith(options: RagAppModuleOptions = {}): ModuleDefinition {
    return {
      module: RagAppModule,
      providers: [value(RAG_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }

  static forStandalone(options: RagAppModuleOptions & { ragServiceUrl: string }): ModuleDefinition {
    return {
      module: RagAppModule,
      providers: [value(RAG_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }
}
```

- [ ] **Step 3: Add ragAppProviders to app composition**

In `src/app/providers.ts`, add:

```typescript
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { promptAppProviders } from './domain/prompt/prompt.providers.js';
import { sessionAppProviders } from './domain/session/session.providers.js';
import { conversationAppProviders } from './domain/conversation/conversation.providers.js';
import { ragAppProviders } from './domain/rag/rag.providers.js';

export function aiAppProviders(): ProviderBundle {
  const prompt = promptAppProviders();
  const session = sessionAppProviders();
  const conversation = conversationAppProviders();
  const rag = ragAppProviders();

  return {
    providers: [
      ...prompt.providers,
      ...session.providers,
      ...conversation.providers,
      ...rag.providers,
    ],
    exports: [...prompt.exports, ...session.exports, ...conversation.exports, ...rag.exports],
  };
}
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/domain/rag/rag.providers.ts src/app/domain/rag/rag.module.ts src/app/providers.ts
git commit -m "feat(rag): add RAG app module, providers, and composition"
```

---

### Task 19: Create RAG client SDK (local + remote mediators)

**Files:**

- Create: `src/app/sdk/rag-client/rag.mapper.ts`
- Create: `src/app/sdk/rag-client/rag-local.mediator.ts`
- Create: `src/app/sdk/rag-client/rag-remote.mediator.ts`
- Create: `src/app/sdk/rag-client/rag-client.module.ts`

- [ ] **Step 1: Create SDK mapper**

Create `src/app/sdk/rag-client/rag.mapper.ts`:

```typescript
import type { IngestResult, DeleteResult, ReplaceResult } from '@/business/domain/rag/rag.model.js';
import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
} from '@/business/domain/rag/client/schemas.js';

export function toIngestClientResult(result: IngestResult): IngestClientResult {
  return { chunksStored: result.chunksStored };
}

export function toDeleteClientResult(result: DeleteResult): DeleteClientResult {
  return { chunksDeleted: result.chunksDeleted };
}

export function toReplaceClientResult(result: ReplaceResult): ReplaceClientResult {
  return { chunksDeleted: result.chunksDeleted, chunksStored: result.chunksStored };
}
```

- [ ] **Step 2: Create local mediator**

Create `src/app/sdk/rag-client/rag-local.mediator.ts`:

```typescript
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { RAG_BUSINESS, type IRagBusiness } from '@/business/domain/rag/rag.interface.js';
import type { IRagMediator } from '@/business/domain/rag/client/mediator.js';
import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
} from '@/business/domain/rag/client/schemas.js';
import type {
  RagIngestCommand,
  RagDeleteCommand,
  RagReplaceCommand,
} from '@/business/domain/rag/client/queries.js';
import { toIngestClientResult, toDeleteClientResult, toReplaceClientResult } from './rag.mapper.js';

/**
 * Monolith adapter — wraps IRagBusiness in-process.
 */
@Injectable()
export class RagLocalMediator implements IRagMediator {
  constructor(@Inject(RAG_BUSINESS) private readonly ragBusiness: IRagBusiness) {}

  async ingest(command: InstanceType<typeof RagIngestCommand>): Promise<IngestClientResult> {
    const result = await this.ragBusiness.ingest({
      scopeId: command.scopeId,
      documents: command.documents,
      chunkOptions: command.chunkOptions,
    });
    return toIngestClientResult(result);
  }

  async delete(command: InstanceType<typeof RagDeleteCommand>): Promise<DeleteClientResult> {
    const result = await this.ragBusiness.delete({
      scopeId: command.scopeId,
      filter: command.filter,
    });
    return toDeleteClientResult(result);
  }

  async replace(command: InstanceType<typeof RagReplaceCommand>): Promise<ReplaceClientResult> {
    const result = await this.ragBusiness.replace({
      scopeId: command.scopeId,
      documentId: command.documentId,
      content: command.content,
      chunkOptions: command.chunkOptions,
    });
    return toReplaceClientResult(result);
  }
}
```

- [ ] **Step 3: Create remote mediator**

Create `src/app/sdk/rag-client/rag-remote.mediator.ts`:

```typescript
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IRagMediator } from '@/business/domain/rag/client/mediator.js';
import type {
  IngestClientResult,
  DeleteClientResult,
  ReplaceClientResult,
} from '@/business/domain/rag/client/schemas.js';
import {
  ingestResultSchema,
  deleteResultSchema,
  replaceResultSchema,
} from '@/business/domain/rag/client/schemas.js';
import type {
  RagIngestCommand,
  RagDeleteCommand,
  RagReplaceCommand,
} from '@/business/domain/rag/client/queries.js';
import { RagIngestClientError, RagDeleteClientError } from '@/business/domain/rag/client/errors.js';

export interface HttpClient {
  post(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  delete(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  put(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
}

export const AI_RAG_HTTP_CLIENT = createToken<HttpClient>('AI_RAG_HTTP_CLIENT');
export const AI_RAG_REMOTE_CONFIG = createToken<{ baseUrl: string }>('AI_RAG_REMOTE_CONFIG');

/**
 * Microservice adapter — makes HTTP calls to the RAG service.
 */
@Injectable()
export class RagRemoteMediator implements IRagMediator {
  constructor(
    @Inject(AI_RAG_HTTP_CLIENT) private readonly http: HttpClient,
    @Inject(AI_RAG_REMOTE_CONFIG) private readonly config: { baseUrl: string },
  ) {}

  async ingest(command: InstanceType<typeof RagIngestCommand>): Promise<IngestClientResult> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/rag/ingest`, {
      scopeId: command.scopeId,
      documents: command.documents,
      chunkOptions: command.chunkOptions,
    });
    if (!response.ok) {
      throw new RagIngestClientError(new Error(`RAG ingest failed: ${response.status}`));
    }
    return ingestResultSchema.parse(response.body?.data);
  }

  async delete(command: InstanceType<typeof RagDeleteCommand>): Promise<DeleteClientResult> {
    const response = await this.http.delete(`${this.config.baseUrl}/ai/rag/documents`, {
      scopeId: command.scopeId,
      filter: command.filter,
    });
    if (!response.ok) {
      throw new RagDeleteClientError(new Error(`RAG delete failed: ${response.status}`));
    }
    return deleteResultSchema.parse(response.body?.data);
  }

  async replace(command: InstanceType<typeof RagReplaceCommand>): Promise<ReplaceClientResult> {
    const response = await this.http.put(
      `${this.config.baseUrl}/ai/rag/documents/${command.documentId}`,
      { scopeId: command.scopeId, content: command.content, chunkOptions: command.chunkOptions },
    );
    if (!response.ok) {
      throw new RagIngestClientError(new Error(`RAG replace failed: ${response.status}`));
    }
    return replaceResultSchema.parse(response.body?.data);
  }
}
```

- [ ] **Step 4: Create client module**

Create `src/app/sdk/rag-client/rag-client.module.ts`:

```typescript
import { alias, value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { RAG_MEDIATOR } from '@/business/domain/rag/client/mediator.js';
import { RagLocalMediator } from './rag-local.mediator.js';
import {
  RagRemoteMediator,
  AI_RAG_HTTP_CLIENT,
  AI_RAG_REMOTE_CONFIG,
  type HttpClient,
} from './rag-remote.mediator.js';

interface StandaloneOptions {
  readonly baseUrl: string;
  readonly httpClientToken: IToken<HttpClient>;
}

export function ragClientMonolithProviders(): ProviderBundle {
  return {
    providers: [bind(RAG_MEDIATOR, RagLocalMediator)],
    exports: [RAG_MEDIATOR],
  };
}

export function ragClientStandaloneProviders(options: StandaloneOptions): ProviderBundle {
  return {
    providers: [
      alias(AI_RAG_HTTP_CLIENT, options.httpClientToken),
      value(AI_RAG_REMOTE_CONFIG, { baseUrl: options.baseUrl }),
      bind(RAG_MEDIATOR, RagRemoteMediator),
    ],
    exports: [RAG_MEDIATOR],
  };
}
```

- [ ] **Step 5: Verify types compile**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/sdk/rag-client/
git commit -m "feat(rag): add RAG client SDK with local and remote mediators"
```

---

## Chunk 7: Package Exports + Peer Dependencies

### Task 20: Add peer dependencies and package exports

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add new peer dependencies**

In `package.json`, add to `peerDependencies`:

```json
"@mastra/rag": "^2.1.0",
"@mastra/pg": "^1.8.0",
"ai": "^6.0.0"
```

- [ ] **Step 2: Add RAG domain exports**

In `package.json`, add to the `exports` field (following the existing granular pattern for conversation/session domains):

```json
"./business/rag": {
  "types": "./dist/business/domain/rag/rag.interface.d.ts",
  "default": "./dist/business/domain/rag/rag.interface.js"
},
"./business/rag/model": {
  "types": "./dist/business/domain/rag/rag.model.d.ts",
  "default": "./dist/business/domain/rag/rag.model.js"
},
"./business/rag/error": {
  "types": "./dist/business/domain/rag/rag.error.d.ts",
  "default": "./dist/business/domain/rag/rag.error.js"
},
"./business/rag/providers": {
  "types": "./dist/business/domain/rag/rag.providers.d.ts",
  "default": "./dist/business/domain/rag/rag.providers.js"
},
"./business/rag/testing": {
  "types": "./dist/business/domain/rag/rag.testing.d.ts",
  "default": "./dist/business/domain/rag/rag.testing.js"
},
"./business/rag/client/schemas": {
  "types": "./dist/business/domain/rag/client/schemas.d.ts",
  "default": "./dist/business/domain/rag/client/schemas.js"
},
"./business/rag/client/queries": {
  "types": "./dist/business/domain/rag/client/queries.d.ts",
  "default": "./dist/business/domain/rag/client/queries.js"
},
"./business/rag/client/errors": {
  "types": "./dist/business/domain/rag/client/errors.d.ts",
  "default": "./dist/business/domain/rag/client/errors.js"
},
"./business/rag/client/mediator": {
  "types": "./dist/business/domain/rag/client/mediator.d.ts",
  "default": "./dist/business/domain/rag/client/mediator.js"
},
"./app/rag/module": {
  "types": "./dist/app/domain/rag/rag.module.d.ts",
  "default": "./dist/app/domain/rag/rag.module.js"
},
"./app/rag/providers": {
  "types": "./dist/app/domain/rag/rag.providers.d.ts",
  "default": "./dist/app/domain/rag/rag.providers.js"
},
"./app/rag-client/module": {
  "types": "./dist/app/sdk/rag-client/rag-client.module.d.ts",
  "default": "./dist/app/sdk/rag-client/rag-client.module.js"
}
```

- [ ] **Step 3: Install new peer deps as dev dependencies for development**

Run: `pnpm add -D @mastra/rag@^2.1.0 @mastra/pg@^1.8.0 ai@^6.0.0`

- [ ] **Step 4: Build and verify**

Run: `pnpm run build && pnpm run check-types`
Expected: PASS

- [ ] **Step 5: Run all tests**

Run: `pnpm run test:unit`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(rag): add peer dependencies and package exports for RAG domain"
```

---

### Task 21: Update original design doc

**Files:**

- Modify: `docs/plans/2026-03-15-ai-package-design.md`

- [ ] **Step 1: Update the "Relationship to Mastra" table**

In the table at line ~29, change:

```
| RAG / context injection                                           | Mastra (direct)                             |
```

to:

```
| RAG write path (ingest, delete, replace)                          | `@sanamy/ai` (adapter wraps `@mastra/pg`)   |
| RAG read path (retrieval, similarity search)                      | Mastra (direct)                             |
```

- [ ] **Step 2: Update the Decisions table**

In the decisions table at line ~768, change:

```
| Don't wrap voice/RAG/evals                        | Too varied and config-heavy. Wrapping adds friction without value. Downstream uses Mastra directly.
```

to:

```
| Don't wrap voice/evals                            | Too varied and config-heavy. Wrapping adds friction without value. Downstream uses Mastra directly.                                                                                                                             |
| Wrap RAG write path only                          | Experience building `aiya` showed the ingest/delete/replace pipeline is common enough to standardize. The read path (retrieval) remains Mastra-direct since agents handle it through built-in tools. See `docs/superpowers/specs/2026-03-16-rag-module-design.md`. |
```

- [ ] **Step 3: Commit**

```bash
git add docs/plans/2026-03-15-ai-package-design.md
git commit -m "docs: update original design doc to reflect RAG write-path wrapping"
```

---

### Task 22: Final verification

- [ ] **Step 1: Full build**

Run: `pnpm run build`
Expected: PASS

- [ ] **Step 2: Type checking**

Run: `pnpm run check-types`
Expected: PASS

- [ ] **Step 3: Lint**

Run: `pnpm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 4: All unit tests**

Run: `pnpm run test:unit`
Expected: All tests pass including new RAG tests

- [ ] **Step 5: Format**

Run: `pnpm run format`
Expected: Files formatted
