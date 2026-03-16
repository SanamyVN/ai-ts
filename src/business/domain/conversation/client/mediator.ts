import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { ConversationClient, ConversationResponseClient } from './schemas.js';
import { CreateConversationCommand, SendMessageCommand } from './queries.js';

export interface IConversationMediator {
  create(command: InstanceType<typeof CreateConversationCommand>): Promise<ConversationClient>;
  sendMessage(
    command: InstanceType<typeof SendMessageCommand>,
  ): Promise<ConversationResponseClient>;
}

export const CONVERSATION_MEDIATOR = createMediatorToken<IConversationMediator>(
  'CONVERSATION_MEDIATOR',
  {
    create: CreateConversationCommand,
    sendMessage: SendMessageCommand,
  },
);
