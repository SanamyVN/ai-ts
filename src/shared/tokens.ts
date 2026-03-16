import type { PostgresClient } from '@sanamyvn/foundation/database/postgres';
import type { ICache } from '@sanamyvn/foundation/cache';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { AiRequiredSchema } from './schema.js';

export const AI_DB = createToken<PostgresClient<AiRequiredSchema>>('AI_DB');
export const AI_CACHE = createToken<ICache>('AI_CACHE');
export const AI_MEDIATOR = createToken<IMediator>('AI_MEDIATOR');
