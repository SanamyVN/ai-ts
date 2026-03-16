import type { PostgresClient } from '@sanamyvn/foundation/database/postgres';
import type { ICache } from '@sanamyvn/foundation/cache';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { AiSchema } from './schema.js';

/** DI token for the Drizzle database client — provided by the downstream app. */
export const AI_DB = createToken<PostgresClient<AiSchema>>('AI_DB');

/** DI token for the cache client — provided by the downstream app. */
export const AI_CACHE = createToken<ICache>('AI_CACHE');

/** DI token for the mediator (CQRS bus) — provided by the downstream app. */
export const AI_MEDIATOR = createToken<IMediator>('AI_MEDIATOR');
