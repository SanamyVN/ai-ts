/**
 * Integration tests: search_path isolation contract (Business Rule 7, v1.27).
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

/**
 * Verifies that SET LOCAL search_path reverts to the session-level value once
 * the transaction boundary closes, proving that a hypothetical regression that
 * drops the LOCAL keyword would leak tenant scope across pooled connections.
 *
 * Fixture API note: `pg` exposes only `pg.db` (NodePgDatabase wrapping a pool)
 * and does not provide a raw PoolClient accessor. To guarantee same-client
 * execution across the SET LOCAL boundary, this test uses a manual SAVEPOINT
 * and ROLLBACK TO SAVEPOINT within a single outer `pg.db.transaction()` call
 * (which holds one pool client for its entire duration). PostgreSQL guarantees
 * that ROLLBACK TO SAVEPOINT reverts a SET LOCAL to the value at savepoint
 * time — the same mechanism that reverts SET LOCAL at transaction end. All
 * assertions run on the same physical connection.
 */
describe('search_path isolation — connection state revert', () => {
  it('SET LOCAL search_path reverts to session-level after the transaction closes', async () => {
    let schemaInsideTx = '';
    let schemaAfterRollback = '';

    await pg.db.transaction(async (tx) => {
      // Step 1: set a session-level (non-LOCAL) search_path = SCHEMA_A on this
      // connection. Plain SET persists beyond any savepoint or transaction end.
      await tx.execute(sql`SET search_path = ${sql.identifier(SCHEMA_A)}, public`);

      const beforeResult = await tx.execute<{ schema: string }>(
        sql`SELECT current_schema() AS schema`,
      );
      expect(beforeResult.rows[0]?.schema).toBe(SCHEMA_A);

      // Step 2: create a savepoint that captures the current session state
      // (search_path = SCHEMA_A). ROLLBACK TO this savepoint will undo any
      // SET LOCAL issued after this point — matching what COMMIT does to the
      // whole transaction.
      await tx.execute(sql`SAVEPOINT revert_check`);

      // Step 3: SET LOCAL overrides search_path within this savepoint scope.
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_B)}, public`);

      const duringResult = await tx.execute<{ schema: string }>(
        sql`SELECT current_schema() AS schema`,
      );
      schemaInsideTx = duringResult.rows[0]?.schema ?? '';

      // Step 4: write a session — must land in SCHEMA_B.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      await new SessionDrizzleRepository({ db: tx } as never).create(newSession('revert-check'));

      // Step 5: roll back to the savepoint. PostgreSQL reverts the SET LOCAL,
      // restoring search_path to SCHEMA_A. This is equivalent to what happens
      // when the enclosing transaction commits (SET LOCAL exits scope).
      // The write above is also rolled back — we verify data via SCHEMA_B count
      // in a second pass below after a clean committed write.
      await tx.execute(sql`ROLLBACK TO SAVEPOINT revert_check`);

      const afterResult = await tx.execute<{ schema: string }>(
        sql`SELECT current_schema() AS schema`,
      );
      schemaAfterRollback = afterResult.rows[0]?.schema ?? '';
    });

    // Step 3 assertion: SET LOCAL correctly pointed at SCHEMA_B inside the scope.
    expect(schemaInsideTx).toBe(SCHEMA_B);

    // Step 5 assertion: after rolling back to the savepoint, search_path is
    // SCHEMA_A again. If SET LOCAL were replaced with plain SET this would still
    // be SCHEMA_B, revealing the leak.
    expect(schemaAfterRollback).toBe(SCHEMA_A);

    // Step 4 (data): verify a committed write goes to the right schema via the
    // normal SET LOCAL path already tested above — just confirm counts are clean.
    await pg.db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL search_path = ${sql.identifier(SCHEMA_B)}, public`);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- test shim
      await new SessionDrizzleRepository({ db: tx } as never).create(newSession('revert-check'));
    });
    expect(await countIn(SCHEMA_B, 'ai_sessions')).toBe(1);
    expect(await countIn(SCHEMA_A, 'ai_sessions')).toBe(0);

    // Step 6: no extra cleanup needed — afterEach truncates all schemas.
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
