import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { SessionClientModel, SessionSummaryClient, MessageListClient } from './schemas.js';
import {
  FindSessionByIdQuery,
  ListSessionsQuery,
  CreateSessionCommand,
  EndSessionCommand,
  UpdateSessionCommand,
  UpdateSessionLastMessageCommand,
  GetSessionMessagesQuery,
} from './queries.js';

export interface ISessionMediator {
  findById(query: InstanceType<typeof FindSessionByIdQuery>): Promise<SessionClientModel>;
  list(query: InstanceType<typeof ListSessionsQuery>): Promise<SessionSummaryClient[]>;
  create(command: InstanceType<typeof CreateSessionCommand>): Promise<SessionClientModel>;
  end(command: InstanceType<typeof EndSessionCommand>): Promise<void>;
  update(command: InstanceType<typeof UpdateSessionCommand>): Promise<void>;
  updateLastMessage(command: InstanceType<typeof UpdateSessionLastMessageCommand>): Promise<void>;
  getMessages(query: InstanceType<typeof GetSessionMessagesQuery>): Promise<MessageListClient>;
}

export const SESSION_MEDIATOR = createMediatorToken<ISessionMediator>('SESSION_MEDIATOR', {
  findById: FindSessionByIdQuery,
  list: ListSessionsQuery,
  create: CreateSessionCommand,
  end: EndSessionCommand,
  update: UpdateSessionCommand,
  updateLastMessage: UpdateSessionLastMessageCommand,
  getMessages: GetSessionMessagesQuery,
});
