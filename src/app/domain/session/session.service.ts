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

  async list(query?: {
    userId?: string;
    tenantId?: string;
    purpose?: string;
    status?: string;
  }): Promise<SessionSummaryResponseDto[]> {
    const results = await this.mediator.send(new ListSessionsQuery(query ?? {}));
    return results.map(toSessionSummaryResponseDtoFromClient);
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
}

export const SESSION_APP_SERVICE = createToken<SessionAppService>('SESSION_APP_SERVICE');
