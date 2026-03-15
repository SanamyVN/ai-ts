import { z } from 'zod';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import {
  createConversationDto,
  conversationResponseDto,
  sendMessageDto,
  messageResponseDto,
} from './conversation.dto.js';
import type { ConversationAppService } from './conversation.service.js';
import type { ConversationMiddlewareConfig } from './conversation.tokens.js';

const idParams = z.object({ id: z.string() });

export class ConversationRouter implements IRouter {
  readonly basePath = '/ai/conversations';

  constructor(
    private readonly service: ConversationAppService,
    private readonly middlewareConfig: ConversationMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .post('/')
      .middleware(...(this.middlewareConfig.create ?? []))
      .schema({ body: createConversationDto, response: conversationResponseDto })
      .handle(async ({ body }) =>
        this.service.create({
          promptSlug: body.promptSlug,
          promptParams: body.promptParams,
          userId: body.userId,
          purpose: body.purpose,
          ...(body.tenantId !== undefined ? { tenantId: body.tenantId } : {}),
          ...(body.model !== undefined ? { model: body.model } : {}),
        }),
      );

    app
      .post('/:id/messages')
      .middleware(...(this.middlewareConfig.sendMessage ?? []))
      .schema({ params: idParams, body: sendMessageDto, response: messageResponseDto })
      .handle(async ({ params, body }) => this.service.sendMessage(params.id, body.message));

    app
      .post('/:id/messages/stream')
      .middleware(...(this.middlewareConfig.streamMessage ?? []))
      .schema({ params: idParams, body: sendMessageDto, response: messageResponseDto })
      .handle(async ({ params, body }) => this.service.sendMessage(params.id, body.message));
  }
}
