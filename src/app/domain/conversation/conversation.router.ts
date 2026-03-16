import { z } from 'zod';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import {
  createConversationDto,
  conversationResponseDto,
  sendMessageDto,
  messageResponseDto,
} from './conversation.dto.js';
import { CONVERSATION_APP_SERVICE, type ConversationAppService } from './conversation.service.js';
import {
  CONVERSATION_MIDDLEWARE_CONFIG,
  type ConversationMiddlewareConfig,
} from './conversation.tokens.js';

const idParams = z.object({ id: z.string() });

@Injectable()
export class ConversationRouter implements IRouter {
  readonly basePath = '/ai/conversations';

  constructor(
    @Inject(CONVERSATION_APP_SERVICE) private readonly service: ConversationAppService,
    @Inject(CONVERSATION_MIDDLEWARE_CONFIG)
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
