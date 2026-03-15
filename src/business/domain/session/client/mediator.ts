import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { SessionClientModel, SessionSummaryClient } from './schemas.js';
import {
  FindSessionByIdQuery,
  ListSessionsQuery,
  CreateSessionCommand,
  EndSessionCommand,
} from './queries.js';

export interface ISessionMediator {
  findById(query: InstanceType<typeof FindSessionByIdQuery>): Promise<SessionClientModel>;
  list(query: InstanceType<typeof ListSessionsQuery>): Promise<SessionSummaryClient[]>;
  create(command: InstanceType<typeof CreateSessionCommand>): Promise<SessionClientModel>;
  end(command: InstanceType<typeof EndSessionCommand>): Promise<void>;
}

export const SESSION_MEDIATOR = createMediatorToken<ISessionMediator>('SESSION_MEDIATOR', {
  findById: FindSessionByIdQuery,
  list: ListSessionsQuery,
  create: CreateSessionCommand,
  end: EndSessionCommand,
});
