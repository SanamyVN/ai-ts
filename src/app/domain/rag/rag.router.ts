import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IRouter } from '@sanamyvn/foundation/http/router';
import type { IRouterBuilder } from '@sanamyvn/foundation/http/router-builder';
import {
  ingestRequestDto,
  ingestResponseDto,
  deleteRequestDto,
  deleteResponseDto,
  replaceParamsDto,
  replaceRequestDto,
  replaceResponseDto,
} from './rag.dto.js';
import { RAG_APP_SERVICE, type RagAppService } from './rag.service.js';
import { RAG_MIDDLEWARE_CONFIG, type RagMiddlewareConfig } from './rag.tokens.js';

@Injectable()
export class RagRouter implements IRouter {
  readonly basePath = '/ai/rag';

  constructor(
    @Inject(RAG_APP_SERVICE) private readonly service: RagAppService,
    @Inject(RAG_MIDDLEWARE_CONFIG) private readonly middlewareConfig: RagMiddlewareConfig,
  ) {}

  register(app: IRouterBuilder): void {
    app
      .post('/ingest')
      .middleware(...(this.middlewareConfig.ingest ?? []))
      .schema({ body: ingestRequestDto, response: ingestResponseDto })
      .handle(async ({ body }) => this.service.ingest(body));

    app
      .delete('/documents')
      .middleware(...(this.middlewareConfig.delete ?? []))
      .schema({ body: deleteRequestDto, response: deleteResponseDto })
      .handle(async ({ body }) => this.service.delete(body));

    app
      .put('/documents/:documentId')
      .middleware(...(this.middlewareConfig.replace ?? []))
      .schema({ params: replaceParamsDto, body: replaceRequestDto, response: replaceResponseDto })
      .handle(async ({ params, body }) => this.service.replace(params.documentId, body));
  }
}
