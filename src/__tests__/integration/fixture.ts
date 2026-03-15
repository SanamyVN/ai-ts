import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';

const POSTGRES_ENV_VAR = 'DATABASE_URL';
const pgSchemaName = `test_${randomBytes(8).toString('hex')}`;

let sql: postgres.Sql | null = null;
let drizzleInstance: PostgresJsDatabase | null = null;

/**
 * Custom Postgres fixture for AI integration tests.
 *
 * Creates an isolated schema per test run using raw SQL DDL derived from the
 * Drizzle schema definitions. Uses the `postgres` (postgres-js) driver to match
 * what the AI repos use in production, ensuring identical error shapes.
 *
 * The schema name is randomised so concurrent test runs never collide.
 *
 * @example
 * // vitest global setup
 * import { pg } from './fixture.js';
 * beforeAll(() => pg.start());
 * afterAll(() => pg.stop());
 * beforeEach(() => pg.truncateAll());
 */
export const pg = {
  schemaName: pgSchemaName,

  get db(): PostgresJsDatabase {
    if (!drizzleInstance) {
      throw new Error('Postgres fixture not started. Call start() before accessing db.');
    }
    return drizzleInstance;
  },

  async start(): Promise<void> {
    const url = process.env[POSTGRES_ENV_VAR] ?? 'postgresql://localhost:5432/test';

    // Bootstrap connection — used only to create schema and tables
    const bootstrap = postgres(url, { max: 1 });
    await bootstrap.unsafe(`CREATE SCHEMA IF NOT EXISTS "${pgSchemaName}"`);

    await bootstrap.unsafe(`
      CREATE TABLE "${pgSchemaName}".ai_prompts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        parameter_schema JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE "${pgSchemaName}".ai_prompt_versions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        prompt_id UUID NOT NULL REFERENCES "${pgSchemaName}".ai_prompts(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        template TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE "${pgSchemaName}".ai_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        mastra_thread_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255),
        prompt_slug VARCHAR(255) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        metadata JSONB,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      );
    `);

    await bootstrap.end();

    // Main connection with search_path baked in via options
    const separator = url.includes('?') ? '&' : '?';
    const connUrl = `${url}${separator}options=-csearch_path%3D${pgSchemaName}%2Cpublic`;
    sql = postgres(connUrl, { max: 5 });
    drizzleInstance = drizzle(sql);
  },

  async stop(): Promise<void> {
    if (sql) {
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${pgSchemaName}" CASCADE`);
      await sql.end();
      sql = null;
      drizzleInstance = null;
    }
  },

  async truncateAll(): Promise<void> {
    if (!sql) {
      throw new Error('Postgres fixture not started. Call start() before truncating.');
    }
    const result = await sql.unsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = '${pgSchemaName}'`,
    );
    if (result.length === 0) return;

    const tableNames = result.map((row) => `"${pgSchemaName}"."${row['tablename']}"`).join(', ');
    await sql.unsafe(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`);
  },
};
