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
  CountMessagesByTenantQuery,
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
    tenantId?: string;
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
        ...(query.tenantId !== undefined ? { tenantId: query.tenantId } : {}),
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

  async appendMessageEvent(sessionId: string, sentAt: Date): Promise<void> {
    await this.mediator.send(new AppendSessionMessageEventCommand({ sessionId, sentAt }));
  }

  async countMessagesByTenant(filter: {
    tenantId: string;
    purpose?: string;
    purposePrefix?: string;
    sentAtGte?: Date;
    sentAtLt?: Date;
  }): Promise<{ count: number }> {
    return this.mediator.send(new CountMessagesByTenantQuery(filter));
  }
}

export const SESSION_APP_SERVICE = createToken<SessionAppService>('SESSION_APP_SERVICE');
