import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import {
  SESSION_SERVICE,
  type ISessionService,
} from '@/business/domain/session/session.interface.js';
import type { ISessionMediator } from '@/business/domain/session/client/mediator.js';
import type {
  SessionClientModel,
  SessionSummaryClient,
} from '@/business/domain/session/client/schemas.js';
import type {
  FindSessionByIdQuery,
  ListSessionsQuery,
  CreateSessionCommand,
  EndSessionCommand,
} from '@/business/domain/session/client/queries.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import { isSessionNotFoundError } from '@/business/domain/session/session.error.js';
import {
  toSessionClientModelFromBusiness,
  toSessionSummaryClientFromBusiness,
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
      ...(query.tenantId !== undefined ? { tenantId: query.tenantId } : {}),
      ...(query.purpose !== undefined ? { purpose: query.purpose } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
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
      ...(command.outputSchema !== undefined ? { outputSchema: command.outputSchema } : {}),
    });
    return toSessionClientModelFromBusiness(session);
  }

  async end(command: InstanceType<typeof EndSessionCommand>): Promise<void> {
    await this.sessionService.end(command.sessionId);
  }
}
