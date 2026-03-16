import { z } from 'zod';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import {
  sessionListQueryDto,
  sessionResponseDto,
  sessionSummaryResponseDto,
  paginationQueryDto,
  transcriptQueryDto,
  transcriptResponseDto,
  messageResponseDto,
} from './session.dto.js';
import { SESSION_APP_SERVICE, type SessionAppService } from './session.service.js';
import { SESSION_MIDDLEWARE_CONFIG, type SessionMiddlewareConfig } from './session.tokens.js';

const idParams = z.object({ id: z.string() });

@Injectable()
export class SessionRouter implements IRouter {
  readonly basePath = '/ai/sessions';

  constructor(
    @Inject(SESSION_APP_SERVICE) private readonly service: SessionAppService,
    @Inject(SESSION_MIDDLEWARE_CONFIG) private readonly middlewareConfig: SessionMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .get('/')
      .middleware(...(this.middlewareConfig.list ?? []))
      .schema({ query: sessionListQueryDto, response: z.array(sessionSummaryResponseDto) })
      .handle(async ({ query }) =>
        this.service.list(
          query !== undefined
            ? {
                ...(query.userId !== undefined ? { userId: query.userId } : {}),
                ...(query.tenantId !== undefined ? { tenantId: query.tenantId } : {}),
                ...(query.purpose !== undefined ? { purpose: query.purpose } : {}),
                ...(query.status !== undefined ? { status: query.status } : {}),
              }
            : undefined,
        ),
      );

    app
      .get('/:id')
      .middleware(...(this.middlewareConfig.get ?? []))
      .schema({ params: idParams, response: sessionResponseDto })
      .handle(async ({ params }) => this.service.get(params.id));

    app
      .get('/:id/messages')
      .middleware(...(this.middlewareConfig.getMessages ?? []))
      .schema({
        params: idParams,
        query: paginationQueryDto,
        response: z.array(messageResponseDto),
      })
      .handle(async ({ params }) => {
        // Ensure the session exists — throws 404 if not found.
        await this.service.get(params.id);
        // TODO: Fetch messages from Mastra thread once mediator contracts cover it.
        return [];
      });

    app
      .get('/:id/transcript')
      .middleware(...(this.middlewareConfig.exportTranscript ?? []))
      .schema({ params: idParams, query: transcriptQueryDto, response: transcriptResponseDto })
      .handle(async ({ params, query }) => {
        // Ensure the session exists — throws 404 if not found.
        await this.service.get(params.id);
        const format = query?.format ?? 'json';
        // TODO: Fetch full message history from Mastra once mediator contracts cover it.
        return { format, messages: [] };
      });

    app
      .put('/:id/end')
      .middleware(...(this.middlewareConfig.end ?? []))
      .schema({ params: idParams })
      .handle(async ({ params, ctx }) => {
        await this.service.end(params.id);
        return ctx.response(204);
      });
  }
}
