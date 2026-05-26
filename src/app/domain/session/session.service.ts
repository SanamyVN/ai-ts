import { createToken, type IToken } from '@sanamyvn/foundation/di/core/tokens';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import {
  FindSessionByIdQuery,
  ListSessionsQuery,
  DeleteSessionCommand,
  EndSessionCommand,
  UpdateSessionTitleCommand,
  AppendSessionMessageEventCommand,
  CountMessagesQuery,
  GetSessionMessagesQuery,
} from '@/business/domain/session/client/queries.js';
import { mapSessionError } from './session.error.js';
import {
  toSessionResponseDtoFromClient,
  toSessionSummaryResponseDtoFromClient,
} from './session.mapper.js';
import type {
  SessionResponseDto,
  SessionSummaryResponseDto,
  MessageResponseDto,
} from './session.dto.js';

@Injectable()
export class SessionAppService {
  constructor(@Inject(AI_MEDIATOR) private readonly mediator: IMediator) {}

  async list(query: {
    userId?: string;
    userIds?: string[];
    purpose?: string;
    purposePrefix?: string;
    status?: string;
    search?: string;
    startedAtGte?: Date;
    startedAtLt?: Date;
    page: number;
    perPage: number;
  }): Promise<{
    items: SessionSummaryResponseDto[];
    page: number;
    perPage: number;
    total: number;
  }> {
    const result = await this.mediator.send(
      new ListSessionsQuery({
        ...(query.userId !== undefined ? { userId: query.userId } : {}),
        ...(query.userIds !== undefined ? { userIds: query.userIds } : {}),
        ...(query.purpose !== undefined ? { purpose: query.purpose } : {}),
        ...(query.purposePrefix !== undefined ? { purposePrefix: query.purposePrefix } : {}),
        ...(query.status !== undefined ? { status: query.status } : {}),
        ...(query.search !== undefined ? { search: query.search } : {}),
        ...(query.startedAtGte !== undefined ? { startedAtGte: query.startedAtGte } : {}),
        ...(query.startedAtLt !== undefined ? { startedAtLt: query.startedAtLt } : {}),
        page: query.page,
        perPage: query.perPage,
      }),
    );
    return {
      items: result.items.map(toSessionSummaryResponseDtoFromClient),
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    };
  }

  async get(sessionId: string): Promise<SessionResponseDto> {
    try {
      const result = await this.mediator.send(new FindSessionByIdQuery({ sessionId }));
      return toSessionResponseDtoFromClient(result);
    } catch (error) {
      mapSessionError(error);
    }
  }

  async end(sessionId: string): Promise<void> {
    try {
      await this.mediator.send(new EndSessionCommand({ sessionId }));
    } catch (error) {
      mapSessionError(error);
    }
  }

  async updateTitle(sessionId: string, title: string): Promise<void> {
    try {
      await this.mediator.send(new UpdateSessionTitleCommand({ sessionId, title }));
    } catch (error) {
      mapSessionError(error);
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await this.mediator.send(new DeleteSessionCommand({ sessionId }));
    } catch (error) {
      mapSessionError(error);
    }
  }

  async appendMessageEvent(sessionId: string, eventId: string, sentAt: Date): Promise<void> {
    try {
      await this.mediator.send(
        new AppendSessionMessageEventCommand({ eventId, sessionId, sentAt }),
      );
    } catch (error) {
      mapSessionError(error);
    }
  }

  /**
   * Retrieves a paginated page of messages for a session.
   *
   * Maps `MessageClient` (createdAt: Date) to `MessageResponseDto`
   * (createdAt: ISO string) so the wire format matches the SDK client schema.
   *
   * @param sessionId - The session to fetch messages for.
   * @param pagination - 1-based page number and page size (1–500).
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  async getMessages(
    sessionId: string,
    pagination: { page: number; perPage: number },
  ): Promise<{
    items: MessageResponseDto[];
    page: number;
    perPage: number;
    total: number;
  }> {
    try {
      const result = await this.mediator.send(
        new GetSessionMessagesQuery({ sessionId, ...pagination }),
      );
      return {
        items: result.items.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
        })),
        page: result.page,
        perPage: result.perPage,
        total: result.total,
      };
    } catch (error) {
      mapSessionError(error);
    }
  }

  /**
   * Counts session message events matching the given filter.
   * Tenant scoping is implicit — the caller must set `search_path` in the
   * active transaction before invoking this method.
   *
   * @example
   * // Count all messages with a given purpose prefix this month
   * const { count } = await sessionAppService.countMessages({
   *   purposePrefix: 'support-',
   *   sentAtGte: new Date('2026-05-01T00:00:00Z'),
   *   sentAtLt: new Date('2026-06-01T00:00:00Z'),
   * });
   */
  async countMessages(filter: {
    purpose?: string;
    purposePrefix?: string;
    sentAtGte?: Date;
    sentAtLt?: Date;
  }): Promise<{ count: number }> {
    try {
      return await this.mediator.send(new CountMessagesQuery(filter));
    } catch (error) {
      mapSessionError(error);
    }
  }
}

export const SESSION_APP_SERVICE: IToken<SessionAppService> = createToken<SessionAppService>('SESSION_APP_SERVICE');
