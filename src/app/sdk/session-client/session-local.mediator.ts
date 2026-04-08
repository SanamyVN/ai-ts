import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import {
  SESSION_SERVICE,
  type ISessionService,
} from '@/business/domain/session/session.interface.js';
import type { ISessionMediator } from '@/business/domain/session/client/mediator.js';
import type {
  SessionClientModel,
  SessionSummaryClient,
  MessageListClient,
} from '@/business/domain/session/client/schemas.js';
import type {
  FindSessionByIdQuery,
  ListSessionsQuery,
  CreateSessionCommand,
  EndSessionCommand,
  UpdateSessionCommand,
  UpdateSessionTitleCommand,
  UpdateSessionLastMessageCommand,
  DeleteSessionCommand,
  GetSessionMessagesQuery,
} from '@/business/domain/session/client/queries.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import { isSessionNotFoundError } from '@/business/domain/session/session.error.js';
import {
  toSessionClientModelFromBusiness,
  toSessionSummaryClientFromBusiness,
  toMessageListClient,
} from './session.mapper.js';

/**
 * Monolith adapter — wraps ISessionService in-process.
 *
 * Used when the session service runs in the same process as consuming features.
 */
@Injectable()
export class SessionLocalMediator implements ISessionMediator {
  constructor(@Inject(SESSION_SERVICE) private readonly sessionService: ISessionService) {}

  async findById(query: InstanceType<typeof FindSessionByIdQuery>): Promise<SessionClientModel> {
    try {
      const session = await this.sessionService.get(query.sessionId);
      return toSessionClientModelFromBusiness(session);
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        throw new SessionNotFoundClientError(query.sessionId, error);
      }
      throw error;
    }
  }

  async list(query: InstanceType<typeof ListSessionsQuery>): Promise<SessionSummaryClient[]> {
    const results = await this.sessionService.list({
      ...(query.userId !== undefined ? { userId: query.userId } : {}),
      ...(query.userIds !== undefined ? { userIds: query.userIds } : {}),
      ...(query.tenantId !== undefined ? { tenantId: query.tenantId } : {}),
      ...(query.purpose !== undefined ? { purpose: query.purpose } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.search !== undefined ? { search: query.search } : {}),
    });
    return results.map(toSessionSummaryClientFromBusiness);
  }

  async create(command: InstanceType<typeof CreateSessionCommand>): Promise<SessionClientModel> {
    const session = await this.sessionService.start({
      userId: command.userId,
      ...(command.tenantId !== undefined ? { tenantId: command.tenantId } : {}),
      promptSlug: command.promptSlug,
      resolvedPrompt: command.resolvedPrompt,
      purpose: command.purpose,
      ...(command.metadata !== undefined ? { metadata: command.metadata } : {}),
    });
    return toSessionClientModelFromBusiness(session);
  }

  async end(command: InstanceType<typeof EndSessionCommand>): Promise<void> {
    await this.sessionService.end(command.sessionId);
  }

  async update(command: InstanceType<typeof UpdateSessionCommand>): Promise<void> {
    await this.sessionService.updateResolvedPrompt(command.sessionId, command.resolvedPrompt);
  }

  async updateTitle(command: InstanceType<typeof UpdateSessionTitleCommand>): Promise<void> {
    try {
      await this.sessionService.updateTitle(command.sessionId, command.title);
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        throw new SessionNotFoundClientError(command.sessionId, error);
      }
      throw error;
    }
  }

  async updateLastMessage(
    command: InstanceType<typeof UpdateSessionLastMessageCommand>,
  ): Promise<void> {
    try {
      await this.sessionService.updateLastMessage(command.sessionId, command.lastMessage);
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        throw new SessionNotFoundClientError(command.sessionId, error);
      }
      throw error;
    }
  }

  async delete(command: InstanceType<typeof DeleteSessionCommand>): Promise<void> {
    try {
      await this.sessionService.delete(command.sessionId);
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        throw new SessionNotFoundClientError(command.sessionId, error);
      }
      throw error;
    }
  }

  async getMessages(
    query: InstanceType<typeof GetSessionMessagesQuery>,
  ): Promise<MessageListClient> {
    try {
      const result = await this.sessionService.getMessages(query.sessionId, {
        page: query.page,
        perPage: query.perPage,
      });
      return toMessageListClient(result);
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        throw new SessionNotFoundClientError(query.sessionId, error);
      }
      throw error;
    }
  }
}
