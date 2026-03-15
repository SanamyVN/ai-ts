import { pg } from './fixture.js';
import { PromptDrizzleRepository } from '@/repository/domain/prompt/prompt.db.js';
import { PromptVersionDrizzleRepository } from '@/repository/domain/prompt-version/prompt-version.db.js';
import { SessionDrizzleRepository } from '@/repository/domain/session/session.db.js';
import { PromptService } from '@/business/domain/prompt/prompt.business.js';
import { SessionService } from '@/business/domain/session/session.business.js';
import {
  createMockMastraAgent,
  createMockMastraMemory,
} from '@/business/sdk/mastra/mastra.testing.js';
import type { IPromptRepository } from '@/repository/domain/prompt/prompt.interface.js';
import type { IPromptVersionRepository } from '@/repository/domain/prompt-version/prompt-version.interface.js';
import type { ISessionRepository } from '@/repository/domain/session/session.interface.js';
import type { IPromptService } from '@/business/domain/prompt/prompt.interface.js';
import type { ISessionService } from '@/business/domain/session/session.interface.js';

export interface AiTestContext {
  promptRepo: IPromptRepository;
  versionRepo: IPromptVersionRepository;
  sessionRepo: ISessionRepository;
  promptService: IPromptService;
  sessionService: ISessionService;
  mastraAgent: ReturnType<typeof createMockMastraAgent>;
  mastraMemory: ReturnType<typeof createMockMastraMemory>;
}

/**
 * Builds a wired test context backed by the Postgres fixture.
 *
 * All three Drizzle repositories are real implementations talking to the isolated
 * test schema. The Mastra agent and memory are `vi.fn()` stubs — tests must set
 * up their return values explicitly.
 *
 * Call this inside `beforeEach` (or at the top of each test) so that every test
 * starts with fresh repository instances pointing at the current `pg.db`.
 *
 * @example
 * let ctx: AiTestContext;
 * beforeEach(() => { ctx = createAiTestContext(); });
 */
export function createAiTestContext(): AiTestContext {
  const promptRepo = new PromptDrizzleRepository(pg.db);
  const versionRepo = new PromptVersionDrizzleRepository(pg.db);
  const sessionRepo = new SessionDrizzleRepository(pg.db);

  const promptService = new PromptService(promptRepo, versionRepo);

  const mastraAgent = createMockMastraAgent();
  const mastraMemory = createMockMastraMemory();
  const sessionService = new SessionService(sessionRepo, mastraMemory);

  return {
    promptRepo,
    versionRepo,
    sessionRepo,
    promptService,
    sessionService,
    mastraAgent,
    mastraMemory,
  };
}
