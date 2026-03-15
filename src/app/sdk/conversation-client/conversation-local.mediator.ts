import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import {
  CONVERSATION_ENGINE,
  type IConversationEngine,
} from '@/business/domain/conversation/conversation.interface.js';
import type { IConversationMediator } from '@/business/domain/conversation/client/mediator.js';
import type {
  ConversationClient,
  ConversationResponseClient,
} from '@/business/domain/conversation/client/schemas.js';
import type {
  CreateConversationCommand,
  SendMessageCommand,
} from '@/business/domain/conversation/client/queries.js';
import {
  toConversationClientFromBusiness,
  toConversationResponseClientFromBusiness,
} from './conversation.mapper.js';

/**
 * Monolith adapter — wraps IConversationEngine in-process.
 *
 * Used when the conversation engine runs in the same process as consuming features.
 */
@Injectable()
export class ConversationLocalMediator implements IConversationMediator {
  constructor(@Inject(CONVERSATION_ENGINE) private readonly engine: IConversationEngine) {}

  async create(
    command: InstanceType<typeof CreateConversationCommand>,
  ): Promise<ConversationClient> {
    const conversation = await this.engine.create({
      promptSlug: command.promptSlug,
      promptParams: command.promptParams,
      userId: command.userId,
      ...(command.tenantId !== undefined ? { tenantId: command.tenantId } : {}),
      purpose: command.purpose,
      ...(command.model !== undefined ? { model: command.model } : {}),
    });
    return toConversationClientFromBusiness(conversation);
  }

  async sendMessage(
    command: InstanceType<typeof SendMessageCommand>,
  ): Promise<ConversationResponseClient> {
    const response = await this.engine.send(command.conversationId, command.message);
    return toConversationResponseClientFromBusiness(response);
  }
}
