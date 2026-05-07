import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '@/repository/domain/session/session.interface.js';
import {
  SESSION_MESSAGE_REPOSITORY,
  type ISessionMessageRepository,
  type SessionMessageRepoFilter,
} from '@/repository/domain/session-message/session-message.interface.js';
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
  CountMessagesFilter,
  Transcript,
} from './session.model.js';
import { SessionNotFoundError, SessionAlreadyEndedError } from './session.error.js';
import { isSessionNotFoundRepoError } from '@/repository/domain/session/session.error.js';
import { toSessionFromRecord, toSessionSummaryFromRecord } from './session.mapper.js';

@Injectable()
export class SessionService implements ISessionService {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepo: ISessionRepository,
    @Inject(MASTRA_MEMORY) private readonly mastraMemory: IMastraMemory,
    @Inject(SESSION_MESSAGE_REPOSITORY)
    private readonly sessionMessageRepo: ISessionMessageRepository,
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

  /**
   * Lists sessions matching the given filter, newest first. Collects the page's
   * session ids, queries the message-event ledger for per-session counts in one
   * round-trip, then projects `messageCount` onto each summary. (§1, §5)
   */
  async list(
    filter: SessionFilter,
    pagination: { page: number; perPage: number },
  ): Promise<SessionSummary[]> {
    const records = await this.sessionRepo.list(filter, pagination);
    const ids = records.map((r) => r.id);
    const countMap = await this.sessionMessageRepo.countBySession(ids);
    return records.map((record) =>
      toSessionSummaryFromRecord(record, countMap.get(record.id) ?? 0),
    );
  }

  async getMessages(sessionId: string, pagination: Pagination): Promise<MessageList> {
    const session = await this.getSessionOrThrow(sessionId);
    return this.mastraMemory.getMessages(session.mastraThreadId, pagination);
  }

  async updateResolvedPrompt(sessionId: string, resolvedPrompt: string): Promise<void> {
    await this.sessionRepo.updateResolvedPrompt(sessionId, resolvedPrompt);
  }

  async updateLastMessage(sessionId: string, lastMessage: string): Promise<void> {
    try {
      await this.sessionRepo.updateLastMessage(sessionId, lastMessage, new Date());
    } catch (error) {
      if (isSessionNotFoundRepoError(error)) {
        throw new SessionNotFoundError(sessionId, { cause: error });
      }
      throw error;
    }
  }

  async updateTitle(sessionId: string, title: string): Promise<void> {
    try {
      await this.sessionRepo.updateTitle(sessionId, title);
    } catch (error) {
      if (isSessionNotFoundRepoError(error)) {
        throw new SessionNotFoundError(sessionId, { cause: error });
      }
      throw error;
    }
  }

  async delete(sessionId: string): Promise<void> {
    const session = await this.getSessionOrThrow(sessionId);
    await this.mastraMemory.deleteThread(session.mastraThreadId);
    try {
      await this.sessionRepo.deleteById(sessionId);
    } catch (error) {
      if (isSessionNotFoundRepoError(error)) {
        throw new SessionNotFoundError(sessionId, { cause: error });
      }
      throw error;
    }
  }

  async exportTranscript(sessionId: string, format: 'json' | 'text'): Promise<Transcript> {
    const session = await this.getSessionOrThrow(sessionId);
    const { messages } = await this.mastraMemory.getMessages(session.mastraThreadId, {
      page: 0,
      perPage: 10000,
    });

    const content =
      format === 'json'
        ? JSON.stringify(messages, null, 2)
        : messages.map((m) => `[${m.role}] ${m.content}`).join('\n');

    return { sessionId, format, content, messages };
  }

  /**
   * Appends one event row to `ai_session_messages`. The `sentAt` timestamp is
   * captured at hook entry in Phase 4 so it reflects when the user sent the
   * message, not when this write completes (§1 "When sent_at is captured").
   *
   * Returns silently when `session.tenantId` is null — tenantless sessions are
   * not billable; writing a row with `tenant_id = ''` would pollute aggregates.
   * Throws `SessionNotFoundError` when the session is missing so the
   * best-effort wrapper in `conversation.business` can log and swallow cleanly.
   * (§1 "Service surface")
   */
  async appendMessageEvent(eventId: string, sessionId: string, sentAt: Date): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    if (session.tenantId === null) return;
    await this.sessionMessageRepo.append({
      id: eventId,
      sessionId,
      tenantId: session.tenantId,
      purpose: session.purpose,
      sentAt,
    });
  }

  /**
   * Translates `CountMessagesFilter` to `SessionMessageRepoFilter` using the
   * conditional-spread pattern so undefined fields are not propagated. Then
   * delegates to `sessionMessageRepository.count`. Returns a bare number; the
   * mediator wraps it as `{ count }` in Phase 3. (§4)
   */
  async countMessagesByTenant(filter: CountMessagesFilter): Promise<number> {
    const repoFilter: SessionMessageRepoFilter = {
      tenantId: filter.tenantId,
      ...(filter.purpose !== undefined && { purpose: filter.purpose }),
      ...(filter.purposePrefix !== undefined && { purposePrefix: filter.purposePrefix }),
      ...(filter.sentAtGte !== undefined && { sentAtGte: filter.sentAtGte }),
      ...(filter.sentAtLt !== undefined && { sentAtLt: filter.sentAtLt }),
    };
    return this.sessionMessageRepo.count(repoFilter);
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
