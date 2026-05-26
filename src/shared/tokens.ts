import type { PostgresClient } from '@sanamyvn/foundation/database/drizzle';
import type { ICache } from '@sanamyvn/foundation/cache';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { createToken, type IToken } from '@sanamyvn/foundation/di/core/tokens';
import type { AiSchema } from './schema.js';

/** DI token for the Drizzle database client — provided by the downstream app. */
export const AI_DB: IToken<PostgresClient<AiSchema>> = createToken<PostgresClient<AiSchema>>('AI_DB');

/** DI token for the cache client — provided by the downstream app. */
export const AI_CACHE: IToken<ICache> = createToken<ICache>('AI_CACHE');

/** DI token for the mediator (CQRS bus) — provided by the downstream app. */
export const AI_MEDIATOR: IToken<IMediator> = createToken<IMediator>('AI_MEDIATOR');
