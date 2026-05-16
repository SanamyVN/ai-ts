import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { SessionClientModel, SessionSummaryClient, MessageListClient } from './schemas.js';
import {
  FindSessionByIdQuery,
  ListSessionsQuery,
  CreateSessionCommand,
  EndSessionCommand,
  UpdateSessionCommand,
  UpdateSessionTitleCommand,
  UpdateSessionLastMessageCommand,
  DeleteSessionCommand,
  GetSessionMessagesQuery,
  AppendSessionMessageEventCommand,
  CountMessagesQuery,
} from './queries.js';

export interface ISessionMediator {
  findById(query: InstanceType<typeof FindSessionByIdQuery>): Promise<SessionClientModel>;
  list(query: InstanceType<typeof ListSessionsQuery>): Promise<{
    items: SessionSummaryClient[];
    page: number;
    perPage: number;
    /** Filtered session count across all pages. See ListSessionsQuery response JSDoc. */
    total: number;
  }>;
  create(command: InstanceType<typeof CreateSessionCommand>): Promise<SessionClientModel>;
  end(command: InstanceType<typeof EndSessionCommand>): Promise<void>;
  update(command: InstanceType<typeof UpdateSessionCommand>): Promise<void>;
  updateTitle(command: InstanceType<typeof UpdateSessionTitleCommand>): Promise<void>;
  updateLastMessage(command: InstanceType<typeof UpdateSessionLastMessageCommand>): Promise<void>;
  delete(command: InstanceType<typeof DeleteSessionCommand>): Promise<void>;
  getMessages(query: InstanceType<typeof GetSessionMessagesQuery>): Promise<MessageListClient>;
  appendMessageEvent(command: InstanceType<typeof AppendSessionMessageEventCommand>): Promise<void>;
  countMessages(query: InstanceType<typeof CountMessagesQuery>): Promise<{ count: number }>;
}

export const SESSION_MEDIATOR = createMediatorToken<ISessionMediator>('SESSION_MEDIATOR', {
  findById: FindSessionByIdQuery,
  list: ListSessionsQuery,
  create: CreateSessionCommand,
  end: EndSessionCommand,
  update: UpdateSessionCommand,
  updateTitle: UpdateSessionTitleCommand,
  updateLastMessage: UpdateSessionLastMessageCommand,
  delete: DeleteSessionCommand,
  getMessages: GetSessionMessagesQuery,
  appendMessageEvent: AppendSessionMessageEventCommand,
  countMessages: CountMessagesQuery,
});
