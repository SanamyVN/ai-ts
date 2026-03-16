import { createPostgresFixture } from '@sanamyvn/foundation/testing/postgres';
import { aiSchema } from '@/shared/schema.js';

export const pg = createPostgresFixture({ schema: aiSchema });
