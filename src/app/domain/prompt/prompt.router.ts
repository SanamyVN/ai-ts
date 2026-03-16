import { z } from 'zod';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import {
  createPromptDto,
  createVersionDto,
  promptListQueryDto,
  promptResponseDto,
  updatePromptDto,
} from './prompt.dto.js';
import { PROMPT_APP_SERVICE, type PromptAppService } from './prompt.service.js';
import { PROMPT_MIDDLEWARE_CONFIG, type PromptMiddlewareConfig } from './prompt.tokens.js';

const slugParams = z.object({ slug: z.string() });
const slugAndIdParams = z.object({ slug: z.string(), id: z.string() });

@Injectable()
export class PromptRouter implements IRouter {
  readonly basePath = '/ai/prompts';

  constructor(
    @Inject(PROMPT_APP_SERVICE) private readonly service: PromptAppService,
    @Inject(PROMPT_MIDDLEWARE_CONFIG) private readonly middlewareConfig: PromptMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .post('/')
      .middleware(...(this.middlewareConfig.create ?? []))
      .schema({ body: createPromptDto, response: promptResponseDto })
      .handle(async ({ body }) =>
        this.service.create({
          name: body.name,
          slug: body.slug,
          ...(body.parameterSchema !== undefined ? { parameterSchema: body.parameterSchema } : {}),
          ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
        }),
      );

    app
      .get('/')
      .middleware(...(this.middlewareConfig.list ?? []))
      .schema({ query: promptListQueryDto, response: z.array(promptResponseDto) })
      .handle(async ({ query }) =>
        this.service.list(query?.search !== undefined ? { search: query.search } : undefined),
      );

    app
      .get('/:slug')
      .middleware(...(this.middlewareConfig.getBySlug ?? []))
      .schema({ params: slugParams, response: promptResponseDto })
      .handle(async ({ params }) => this.service.getBySlug(params.slug));

    app
      .put('/:slug')
      .middleware(...(this.middlewareConfig.update ?? []))
      .schema({ params: slugParams, body: updatePromptDto, response: promptResponseDto })
      .handle(async ({ params, body }) =>
        this.service.create({
          name: body.name ?? params.slug,
          slug: params.slug,
          ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
        }),
      );

    app
      .post('/:slug/versions')
      .middleware(...(this.middlewareConfig.createVersion ?? []))
      .schema({ params: slugParams, body: createVersionDto, response: promptResponseDto })
      .handle(async ({ params, body }) =>
        this.service.createVersion(params.slug, {
          template: body.template,
          ...(body.activate !== undefined ? { activate: body.activate } : {}),
        }),
      );

    app
      .put('/:slug/versions/:id/activate')
      .middleware(...(this.middlewareConfig.activateVersion ?? []))
      .schema({ params: slugAndIdParams })
      .handle(async ({ params, ctx }) => {
        await this.service.activateVersion(params.slug, params.id);
        return ctx.response(204);
      });

    app
      .get('/:slug/versions')
      .middleware(...(this.middlewareConfig.listVersions ?? []))
      .schema({ params: slugParams, response: promptResponseDto })
      .handle(async ({ params }) => this.service.listVersions(params.slug));
  }
}
