import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import {
  CreateConversationCommand,
  SendMessageCommand,
} from '@/business/domain/conversation/client/queries.js';
import { mapConversationError } from './conversation.error.js';
import { toConversationResponseDtoFromClient } from './conversation.mapper.js';
import type { ConversationResponseDto, MessageResponseDto } from './conversation.dto.js';

export class ConversationAppService {
  constructor(private readonly mediator: IMediator) {}

  async create(input: {
    promptSlug: string;
    promptParams: Record<string, unknown>;
    userId: string;
    tenantId?: string;
    purpose: string;
    model?: string;
  }): Promise<ConversationResponseDto> {
    try {
      const result = await this.mediator.send(new CreateConversationCommand(input));
      return toConversationResponseDtoFromClient(result);
    } catch (error) {
      mapConversationError(error);
    }
  }

  async sendMessage(conversationId: string, message: string): Promise<MessageResponseDto> {
    try {
      const result = await this.mediator.send(new SendMessageCommand({ conversationId, message }));
      return {
        text: result.text,
        ...(result.object !== undefined ? { object: result.object } : {}),
      };
    } catch (error) {
      mapConversationError(error);
    }
  }
}

export const CONVERSATION_APP_SERVICE = createToken<ConversationAppService>(
  'CONVERSATION_APP_SERVICE',
);
