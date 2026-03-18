import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '@/repository/domain/session/session.interface.js';
import {
  MASTRA_MEMORY,
  type IMastraMemory,
  type MessageList,
  type Pagination,
} from '@/business/sdk/mastra/mastra.interface.js';
import type { ISessionService } from './session.interface.js';
import type {
  Session,
  SessionSummary,
  StartSessionInput,
  SessionFilter,
  Transcript,
} from './session.model.js';
import { SessionNotFoundError, SessionAlreadyEndedError } from './session.error.js';
import { toSessionFromRecord, toSessionSummaryFromRecord } from './session.mapper.js';

@Injectable()
export class SessionService implements ISessionService {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
    @Inject(MASTRA_MEMORY) private readonly mastraMemory: IMastraMemory,
  ) {}

  async start(input: StartSessionInput): Promise<Session> {
    const thread = await this.mastraMemory.createThread(input.userId);
    const record = await this.sessionRepo.create({
      mastraThreadId: thread.id,
      userId: input.userId,
      tenantId: input.tenantId ?? null,
      promptSlug: input.promptSlug,
      resolvedPrompt: input.resolvedPrompt,
      purpose: input.purpose,
      metadata: input.metadata ?? null,
    });
    return toSessionFromRecord(record);
  }

  async pause(sessionId: string): Promise<void> {
    const session = await this.getSessionOrThrow(sessionId);
    this.assertNotEnded(session);
    await this.sessionRepo.updateStatus(sessionId, 'paused');
  }

  async resume(sessionId: string): Promise<Session> {
    const session = await this.getSessionOrThrow(sessionId);
    this.assertNotEnded(session);
    const record = await this.sessionRepo.updateStatus(sessionId, 'active');
    return toSessionFromRecord(record);
  }

  async end(sessionId: string): Promise<void> {
    const session = await this.getSessionOrThrow(sessionId);
    this.assertNotEnded(session);
    await this.sessionRepo.updateStatus(sessionId, 'ended', new Date());
  }

  async get(sessionId: string): Promise<Session> {
    return this.getSessionOrThrow(sessionId);
  }

  async list(filter: SessionFilter): Promise<SessionSummary[]> {
    const records = await this.sessionRepo.list(filter);
    return records.map(toSessionSummaryFromRecord);
  }

  async getMessages(sessionId: string, pagination: Pagination): Promise<MessageList> {
    const session = await this.getSessionOrThrow(sessionId);
    return this.mastraMemory.getMessages(session.mastraThreadId, pagination);
  }

  async updateResolvedPrompt(sessionId: string, resolvedPrompt: string): Promise<void> {
    await this.sessionRepo.updateResolvedPrompt(sessionId, resolvedPrompt);
  }

  async exportTranscript(sessionId: string, format: 'json' | 'text'): Promise<Transcript> {
    const session = await this.getSessionOrThrow(sessionId);
    const { messages } = await this.mastraMemory.getMessages(session.mastraThreadId, {
      page: 1,
      perPage: 10000,
    });

    const content =
      format === 'json'
        ? JSON.stringify(messages, null, 2)
        : messages.map((m) => `[${m.role}] ${m.content}`).join('\n');

    return { sessionId, format, content, messages };
  }

  private async getSessionOrThrow(sessionId: string): Promise<Session> {
    const record = await this.sessionRepo.findById(sessionId);
    if (!record) {
      throw new SessionNotFoundError(sessionId);
    }
    return toSessionFromRecord(record);
  }

  private assertNotEnded(session: Session): void {
    if (session.status === 'ended') {
      throw new SessionAlreadyEndedError(session.id);
    }
  }
}
