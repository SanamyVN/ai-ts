/**
 * Integration tests: search_path isolation contract (Business Rule 7, v2.0).
 *
 * Proves that ai-ts repositories inherit the active `SET LOCAL search_path`
 * from the caller's transaction. Two schemas are provisioned (cloned from the
 * fixture's tables via `CREATE TABLE ... LIKE ... INCLUDING ALL`). Each test
 * runs two `pg.db.transaction()` blocks; each transaction issues
 * `SET LOCAL search_path = <target>` before instantiating a repository against
 * the transactional client. Rows land in the schema the transaction targets.
 *
 * If a future change makes a repository open a side connection or hard-code a
 * schema, these tests fail because the transaction-local search_path no longer
 * routes the queries.
 *
 * Requires Docker; run with `pnpm test:integration`.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { pg } from '../fixture.js';
import { SessionDrizzleRepository } from '@/repository/domain/session/session.db.js';
import { SessionMessageDrizzleRepository } from '@/repository/domain/session-message/session-message.db.js';

const SCHEMA_A = 'sp_test_tenant_a';
const SCHEMA_B = 'sp_test_tenant_b';

beforeAll(async () => {
  await pg.start();

  // The fixture exposes the schema it created; clone its tables into SCHEMA_A/B.
  const sourceSchema = pg.schemaName;

  for (const target of [SCHEMA_A, SCHEMA_B]) {
    await pg.db.execute(sql`DROP SCHEMA IF EXISTS ${sql.identifier(target)} CASCADE`);
    await pg.db.execute(sql`CREATE SCHEMA ${sql.identifier(target)}`);
    await pg.db.execute(
      sql`CREATE TABLE ${sql.identifier(target)}.ai_sessions (LIKE ${sql.identifier(sourceSchema)}.ai_sessions INCLUDING ALL)`,
    );
    await pg.db.execute(
      sql`CREATE TABLE ${sql.identifier(target)}.ai_session_messages (LIKE ${sql.identifier(sourceSchema)}.ai_session_messages INCLUDING ALL)`,
    );
  }
});

afterAll(async () => {
  for (const target of [SCHEMA_A, SCHEMA_B]) {
    await pg.db.execute(sql`DROP SCHEMA IF EXISTS ${sql.identifier(target)} CASCADE`);
  }
  await pg.stop();
});

afterEach(async () => {
  for (const target of [SCHEMA_A, SCHEMA_B]) {
    await pg.db.execute(sql`TRUNCATE ${sql.identifier(target)}.ai_session_messages`);
    await pg.db.execute(sql`TRUNCATE ${sql.identifier(target)}.ai_sessions CASCADE`);
  }
  await pg.truncateAll();
});

function newSession(suffix: string) {
  return {
    mastraThreadId: `thread-sp-${suffix}`,
    userId: 'user-sp',
    promptSlug: 'test-prompt',
    resolvedPrompt: 'resolved',
    purpose: 'testing:search_path',
    status: 'active' as const,
  };
}

async function countIn(
  schema: string,
  table: 'ai_sessions' | 'ai_session_messages',
): Promise<number> {
  const result = await pg.db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM ${sql.identifier(schema)}.${sql.identifier(table)}`,
  );
  // node-postgres returns a QueryResult object; rows are in .rows
  return Number(result.rows[0]?.count ?? '0');
}

describe('search_path isolation — SessionDrizzleRepository', () => {
  it('writes inside a SET LOCAL search_path transaction land in that schema only', async () => {
    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_A)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      const repo = new SessionDrizzleRepository({ db: tx } as never);
      await repo.create(newSession('write-a'));
    });

    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_B)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      const repo = new SessionDrizzleRepository({ db: tx } as never);
      await repo.create(newSession('write-b'));
    });

    expect(await countIn(SCHEMA_A, 'ai_sessions')).toBe(1);
    expect(await countIn(SCHEMA_B, 'ai_sessions')).toBe(1);
  });

  it('list() inside SCHEMA_A transaction returns only SCHEMA_A rows', async () => {
    // Seed one row in each schema (via the transactional path under test).
    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_A)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      await new SessionDrizzleRepository({ db: tx } as never).create(newSession('list-a'));
    });
    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_B)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      await new SessionDrizzleRepository({ db: tx } as never).create(newSession('list-b'));
    });

    const aThreads = await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_A)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      const repo = new SessionDrizzleRepository({ db: tx } as never);
      const rows = await repo.list({ purpose: 'testing:search_path' }, { page: 1, perPage: 100 });
      return rows.map((r) => r.mastraThreadId);
    });

    expect(aThreads).toContain('thread-sp-list-a');
    expect(aThreads).not.toContain('thread-sp-list-b');
  });
});

describe('search_path isolation — SessionMessageDrizzleRepository', () => {
  it('append() inside a SET LOCAL search_path transaction lands in that schema only', async () => {
    // Each schema needs a parent session row before a message can reference it.
    let sessionIdA = '';
    let sessionIdB = '';
    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_A)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      const row = await new SessionDrizzleRepository({ db: tx } as never).create(
        newSession('msg-a'),
      );
      sessionIdA = row.id;
    });
    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_B)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      const row = await new SessionDrizzleRepository({ db: tx } as never).create(
        newSession('msg-b'),
      );
      sessionIdB = row.id;
    });

    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_A)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      await new SessionMessageDrizzleRepository({ db: tx } as never).append({
        id: 'msg-a-1',
        sessionId: sessionIdA,
        purpose: 'testing:search_path',
        sentAt: new Date(),
      });
    });
    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_B)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      await new SessionMessageDrizzleRepository({ db: tx } as never).append({
        id: 'msg-b-1',
        sessionId: sessionIdB,
        purpose: 'testing:search_path',
        sentAt: new Date(),
      });
    });

    expect(await countIn(SCHEMA_A, 'ai_session_messages')).toBe(1);
    expect(await countIn(SCHEMA_B, 'ai_session_messages')).toBe(1);
  });
});
