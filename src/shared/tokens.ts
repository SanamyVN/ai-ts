import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { ICache } from '@sanamyvn/foundation/cache';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';

export const AI_DB = createToken<PostgresJsDatabase>('AI_DB');
export const AI_CACHE = createToken<ICache>('AI_CACHE');
export const AI_MEDIATOR = createToken<IMediator>('AI_MEDIATOR');
