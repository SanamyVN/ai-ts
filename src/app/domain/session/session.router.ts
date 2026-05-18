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
  updateTitleBodyDto,
  countMessagesQueryDto,
  countMessagesResponseDto,
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
      .schema({
        query: sessionListQueryDto,
        response: z.object({
          items: z.array(sessionSummaryResponseDto),
          page: z.number(),
          perPage: z.number(),
          total: z.number().int().nonnegative(),
        }),
      })
      .handle(async ({ query }) =>
        this.service.list({
          ...(query.userId !== undefined ? { userId: query.userId } : {}),
          ...(query.purpose !== undefined ? { purpose: query.purpose } : {}),
          ...(query.purposePrefix !== undefined ? { purposePrefix: query.purposePrefix } : {}),
          ...(query.status !== undefined ? { status: query.status } : {}),
          ...(query.search !== undefined ? { search: query.search } : {}),
          ...(query.startedAtGte !== undefined
            ? { startedAtGte: new Date(query.startedAtGte) }
            : {}),
          ...(query.startedAtLt !== undefined ? { startedAtLt: new Date(query.startedAtLt) } : {}),
          page: query.page,
          perPage: query.perPage,
        }),
      );

    // NOTE: GET /message-events/count MUST be registered before GET /:id to
    // prevent the router from treating 'message-events' as the :id param.
    app
      .get('/message-events/count')
      .middleware(...(this.middlewareConfig.countMessages ?? []))
      .schema({ query: countMessagesQueryDto, response: countMessagesResponseDto })
      .handle(async ({ query }) =>
        this.service.countMessages({
          ...(query.purpose !== undefined ? { purpose: query.purpose } : {}),
          ...(query.purposePrefix !== undefined ? { purposePrefix: query.purposePrefix } : {}),
          ...(query.sentAtGte !== undefined ? { sentAtGte: new Date(query.sentAtGte) } : {}),
          ...(query.sentAtLt !== undefined ? { sentAtLt: new Date(query.sentAtLt) } : {}),
        }),
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
        response: z.object({
          items: z.array(messageResponseDto),
          page: z.number(),
          perPage: z.number(),
          total: z.number().int().nonnegative(),
        }),
      })
      .handle(async ({ params, query }) => {
        // Ensure the session exists — throws 404 if not found.
        await this.service.get(params.id);
        const page = query?.page ?? 1;
        const perPage = query?.perPage ?? 20;
        // TODO: Fetch messages from Mastra thread once mediator contracts cover it.
        return { items: [], page, perPage, total: 0 };
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
      .patch('/:id/title')
      .middleware(...(this.middlewareConfig.updateTitle ?? []))
      .schema({ params: idParams, body: updateTitleBodyDto })
      .handle(async ({ params, body, ctx }) => {
        await this.service.updateTitle(params.id, body.title);
        return ctx.response(204);
      });

    app
      .put('/:id/end')
      .middleware(...(this.middlewareConfig.end ?? []))
      .schema({ params: idParams })
      .handle(async ({ params, ctx }) => {
        await this.service.end(params.id);
        return ctx.response(204);
      });

    app
      .post('/:id/message-events')
      .middleware(...(this.middlewareConfig.appendMessageEvent ?? []))
      .schema({
        params: idParams,
        // ISO 8601 only — reject epoch numbers and locale strings.
        // `z.coerce.date()` would happily parse `1730419200` and `"4/1/2026"`.
        body: z.object({
          /** Stable UUID v4 generated by the caller before each HTTP request. Used for idempotency. */
          eventId: z.uuid(),
          sentAt: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
        }),
      })
      .handle(async ({ params, body, ctx }) => {
        await this.service.appendMessageEvent(params.id, body.eventId, body.sentAt);
        return ctx.response(204);
      });

    app
      .delete('/:id/permanent')
      .middleware(...(this.middlewareConfig.delete ?? []))
      .schema({ params: idParams })
      .handle(async ({ params, ctx }) => {
        await this.service.delete(params.id);
        return ctx.response(204);
      });
  }
}
