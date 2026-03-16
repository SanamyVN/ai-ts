import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import { factory } from '@sanamyvn/foundation/di/core/providers';
import { Module } from '@sanamyvn/foundation/di/node/module';
import { aiPrompts } from '@/repository/domain/prompt/prompt.schema.js';
import { aiPromptVersions } from '@/repository/domain/prompt-version/prompt-version.schema.js';
import { aiSessions } from '@/repository/domain/session/session.schema.js';

/** All AI Drizzle schemas merged into one object for the test fixture. */
export const aiSchema = {
  aiPrompts,
  aiPromptVersions,
  aiSessions,
};

const POSTGRES_ENV_VAR = 'FOUNDATION_TEST_POSTGRES_URL';
const pgSchemaName = `test_${randomBytes(8).toString('hex')}`;

/** Token providing a raw `PostgresJsDatabase` — matches what AI repos inject via `AI_DB`. */
const token = createToken<PostgresJsDatabase>('AI_TEST_DB');

let sql: postgres.Sql | null = null;
let drizzleInstance: PostgresJsDatabase | null = null;

/**
 * Replace explicit `"public"."table"` references in FK DDL with unqualified `"table"`,
 * so they resolve via search_path to the test schema.
 */
function patchPublicSchemaRefs(statement: string): string {
  return statement.replaceAll('"public".', '');
}

/**
 * Custom Postgres fixture for AI integration tests.
 *
 * Uses the `postgres` (postgres-js) driver to match what AI repos use in production,
 * ensuring identical error shapes (important for unique violation detection).
 *
 * DDL is auto-generated from Drizzle schema objects via `drizzle-kit/api` —
 * no manual SQL. FK references are patched to remove `"public".` qualifiers
 * that break isolated test schemas.
 *
 * @example
 * beforeAll(() => pg.start());
 * afterAll(() => pg.stop());
 * afterEach(() => pg.truncateAll());
 */
export const pg = {
  module: class extends Module {
    providers = [
      factory(token, () => {
        if (!drizzleInstance) throw new Error('Postgres fixture not started');
        return drizzleInstance;
      }),
    ];
    exports = [token] as const;
  },
  token,
  schemaName: pgSchemaName,

  get db(): PostgresJsDatabase {
    if (!drizzleInstance) {
      throw new Error('Postgres fixture not started. Call start() before accessing db.');
    }
    return drizzleInstance;
  },

  async start(): Promise<void> {
    if (drizzleInstance) return;

    const url = process.env[POSTGRES_ENV_VAR];
    if (!url) {
      throw new Error(
        `Environment variable ${POSTGRES_ENV_VAR} is not set. Did you call postgres() in your global setup?`,
      );
    }

    // Bootstrap connection to create schema and apply DDL
    const bootstrap = postgres(url, { max: 1 });
    await bootstrap.unsafe(`CREATE SCHEMA IF NOT EXISTS ${pgSchemaName}`);

    // Generate DDL from Drizzle schema objects (no manual SQL)
    const emptySnapshot = generateDrizzleJson({});
    const targetSnapshot = generateDrizzleJson(aiSchema, emptySnapshot.id);
    const statements = await generateMigration(emptySnapshot, targetSnapshot);

    await bootstrap.unsafe(`SET search_path TO ${pgSchemaName}, public`);
    for (const statement of statements) {
      await bootstrap.unsafe(patchPublicSchemaRefs(statement));
    }
    await bootstrap.end();

    // Main connection with search_path baked in via options
    const separator = url.includes('?') ? '&' : '?';
    const connUrl = `${url}${separator}options=-csearch_path%3D${pgSchemaName}%2Cpublic`;
    sql = postgres(connUrl, { max: 5 });
    drizzleInstance = drizzle(sql);
  },

  async stop(): Promise<void> {
    if (sql) {
      await sql.unsafe(`DROP SCHEMA IF EXISTS ${pgSchemaName} CASCADE`);
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
