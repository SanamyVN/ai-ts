import { createToken } from '@sanamyvn/foundation/di/core/tokens';
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
} from '@/business/domain/session/client/queries.js';
import { mapSessionError } from './session.error.js';
import {
  toSessionResponseDtoFromClient,
  toSessionSummaryResponseDtoFromClient,
} from './session.mapper.js';
import type { SessionResponseDto, SessionSummaryResponseDto } from './session.dto.js';

@Injectable()
export class SessionAppService {
  constructor(@Inject(AI_MEDIATOR) private readonly mediator: IMediator) {}

  async list(query: {
    userId?: string;
    purpose?: string;
    purposePrefix?: string;
    status?: string;
    search?: string;
    startedAtGte?: Date;
    startedAtLt?: Date;
    page: number;
    perPage: number;
  }): Promise<{ items: SessionSummaryResponseDto[]; page: number; perPage: number }> {
    const result = await this.mediator.send(
      new ListSessionsQuery({
        ...(query.userId !== undefined ? { userId: query.userId } : {}),
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

export const SESSION_APP_SERVICE = createToken<SessionAppService>('SESSION_APP_SERVICE');
