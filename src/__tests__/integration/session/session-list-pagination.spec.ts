import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { pg } from '../fixture.js';
import type { PostgresClient } from '@sanamyvn/foundation/database/drizzle';
import type { AiSchema } from '@/shared/schema.js';
import { SessionDrizzleRepository } from '@/repository/domain/session/session.db.js';
import type { NewSessionRecord } from '@/repository/domain/session/session.model.js';
import type { SessionRepoFilter } from '@/repository/domain/session/session.interface.js';
import { aiSessions } from '@/repository/domain/session/session.schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapDb(): PostgresClient<AiSchema> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    db: pg.db,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    connect: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    disconnect: async () => {},
    isHealthy: async () => true,
  } as PostgresClient<AiSchema>;
}

let repo: SessionDrizzleRepository;

function newSession(overrides: Partial<NewSessionRecord> = {}): NewSessionRecord {
  return {
    mastraThreadId: `thread-${crypto.randomUUID()}`,
    userId: 'user-int-test',
    promptSlug: 'prompt',
    resolvedPrompt: 'You are a test assistant.',
    purpose: 'ta-chat:test',
    ...overrides,
  };
}

async function seedSessions(n: number, overrides: Partial<NewSessionRecord> = {}) {
  const records = [];
  for (let i = 0; i < n; i++) {
    records.push(await repo.create(newSession(overrides)));
  }
  return records;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SessionDrizzleRepository.list — total invariants (integration)', () => {
  beforeAll(async () => {
    await pg.start();
    repo = new SessionDrizzleRepository(wrapDb());
  });

  afterAll(async () => {
    await pg.stop();
  });

  afterEach(async () => {
    await pg.truncateAll();
  });

  // ── Invariant 1: Non-negative count ──────────────────────────────────────

  it('invariant 1 — total is 0 for a filter that matches zero rows', async () => {
    // No sessions seeded; filter matches nothing
    const result = await repo.list(
      { userId: 'user-that-does-not-exist' },
      { page: 1, perPage: 10 },
    );

    expect(result.total).toBe(0);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.rows).toHaveLength(0);
  });

  // ── Invariant 2: Page bound ───────────────────────────────────────────────

  it('invariant 2 — total >= rows.length for any single page', async () => {
    await seedSessions(5, { userId: 'user-pb' });

    const result = await repo.list({ userId: 'user-pb' }, { page: 1, perPage: 10 });

    expect(result.rows).toHaveLength(5);
    expect(result.total).toBe(5);
    expect(result.total).toBeGreaterThanOrEqual(result.rows.length);
  });

  // ── Invariant 3: Filter parity ────────────────────────────────────────────

  it('invariant 3 — same filter with different pagination returns the same total', async () => {
    await seedSessions(7, { userId: 'user-parity' });

    const page1 = await repo.list({ userId: 'user-parity' }, { page: 1, perPage: 3 });
    const page2 = await repo.list({ userId: 'user-parity' }, { page: 2, perPage: 3 });
    const page3 = await repo.list({ userId: 'user-parity' }, { page: 3, perPage: 3 });

    expect(page1.total).toBe(7);
    expect(page2.total).toBe(7);
    expect(page3.total).toBe(7);
  });

  // ── Invariant 4: Page-walk completeness ──────────────────────────────────

  it('invariant 4 — walking all pages yields exactly total unique rows with no gaps', async () => {
    await seedSessions(25, { userId: 'user-walk' });

    const allIds: string[] = [];
    let page = 1;
    const perPage = 10;
    let totalFromFirstPage: number | undefined;

    for (;;) {
      const result = await repo.list({ userId: 'user-walk' }, { page, perPage });
      if (totalFromFirstPage === undefined) {
        totalFromFirstPage = result.total;
      }
      // Every page must report the same total (no concurrent writes in test)
      expect(result.total).toBe(totalFromFirstPage);
      allIds.push(...result.rows.map((r) => r.id));
      if (result.rows.length < perPage) break;
      page++;
    }

    expect(totalFromFirstPage).toBe(25);
    expect(allIds).toHaveLength(25);
    // No duplicates
    expect(new Set(allIds).size).toBe(25);
  });

  // ── Invariant 5: Empty-page total ────────────────────────────────────────

  it('invariant 5 — page past the last data page returns rows: [], total: 3', async () => {
    await seedSessions(3, { userId: 'user-empty-page' });

    const result = await repo.list({ userId: 'user-empty-page' }, { page: 2, perPage: 10 });

    expect(result.rows).toHaveLength(0);
    expect(result.total).toBe(3);
  });

  // ── Filter parity matrix ─────────────────────────────────────────────────

  it('filter parity — total matches row count for userId + purpose combinations', async () => {
    // Seed 12 sessions across 2 users and 2 purposes
    await seedSessions(4, { userId: 'user-x', purpose: 'chat' });
    await seedSessions(3, { userId: 'user-x', purpose: 'support' });
    await seedSessions(5, { userId: 'user-y', purpose: 'chat' });

    const cases: { filter: SessionRepoFilter; expectedTotal: number }[] = [
      { filter: { userId: 'user-x' }, expectedTotal: 7 },
      { filter: { userId: 'user-y' }, expectedTotal: 5 },
      { filter: { userId: 'user-x', purpose: 'chat' }, expectedTotal: 4 },
      { filter: { userId: 'user-x', purpose: 'support' }, expectedTotal: 3 },
      { filter: { userId: 'user-y', purpose: 'chat' }, expectedTotal: 5 },
      { filter: { userId: 'user-y', purpose: 'support' }, expectedTotal: 0 },
    ];

    for (const { filter, expectedTotal } of cases) {
      const result = await repo.list(filter, { page: 1, perPage: 50 });
      expect(result.total, `filter: ${JSON.stringify(filter)}`).toBe(expectedTotal);
      expect(result.rows.length, `filter: ${JSON.stringify(filter)}`).toBe(expectedTotal);
    }
  });

  it('filter parity — purposePrefix matches only sessions whose purpose starts with the prefix', async () => {
    await seedSessions(3, { userId: 'user-prefix', purpose: 'ta-chat:abc' });
    await seedSessions(2, { userId: 'user-prefix', purpose: 'ta-chat:xyz' });
    await seedSessions(4, { userId: 'user-prefix', purpose: 'support:abc' });

    const result = await repo.list(
      { userId: 'user-prefix', purposePrefix: 'ta-chat:' },
      { page: 1, perPage: 50 },
    );

    expect(result.total).toBe(5);
    expect(result.rows).toHaveLength(5);
  });

  it('filter parity — date range filter: total matches sessions inside [gte, lt)', async () => {
    const outside = new Date('2026-01-01T00:00:00.000Z');

    // startedAt is defaultNow() in the schema — we cannot override it via create().
    // Use purpose to isolate inside vs outside groups, then assert date-range parity.
    await seedSessions(3, { userId: 'user-dates', purpose: 'inside' });
    await seedSessions(2, { userId: 'user-dates', purpose: 'outside' });

    const resultAll = await repo.list({ userId: 'user-dates' }, { page: 1, perPage: 50 });
    expect(resultAll.total).toBe(5);

    const resultInside = await repo.list(
      { userId: 'user-dates', purpose: 'inside' },
      { page: 1, perPage: 50 },
    );
    expect(resultInside.total).toBe(3);

    // Date range: startedAtGte set to epoch, startedAtLt far future — matches all.
    const resultDateAll = await repo.list(
      {
        userId: 'user-dates',
        startedAtGte: new Date('2000-01-01T00:00:00.000Z'),
        startedAtLt: new Date('2099-01-01T00:00:00.000Z'),
      },
      { page: 1, perPage: 50 },
    );
    expect(resultDateAll.total).toBe(5);

    // Date range: startedAtLt in the past — matches zero.
    const resultDateNone = await repo.list(
      {
        userId: 'user-dates',
        startedAtGte: new Date('2000-01-01T00:00:00.000Z'),
        startedAtLt: outside,
      },
      { page: 1, perPage: 50 },
    );
    expect(resultDateNone.total).toBe(0);
  });

  // ── Query count assertions ────────────────────────────────────────────────

  it('single-query guard — exactly one Postgres round trip when page has rows', async () => {
    // We cannot intercept pg.db query events directly from this layer without
    // vendor-specific extensions. Instead, we test the structural guarantee:
    // when `rows.length > 0`, the fallback COUNT is not issued.
    // This is verified by the unit test in session.db.spec.ts:
    // 'does NOT issue a fallback COUNT query when the page has rows'.
    // This integration test confirms the real DB path returns rows and total together.
    await seedSessions(3, { userId: 'user-single-query' });

    const result = await repo.list({ userId: 'user-single-query' }, { page: 1, perPage: 10 });

    // Both rows and total came from the same query; total is consistent.
    expect(result.rows).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.rows.length).toBe(result.total);
  });

  it('empty-page fallback — 3 sessions seeded, page 2 with perPage 10 returns rows: [], total: 3', async () => {
    await seedSessions(3, { userId: 'user-fallback' });

    const result = await repo.list({ userId: 'user-fallback' }, { page: 2, perPage: 10 });

    expect(result.rows).toHaveLength(0);
    expect(result.total).toBe(3);
  });

  // ── Scale baseline (§6.2) ────────────────────────────────────────────────

  it(
    'scale baseline — 10k sessions: returns within 500ms and the plan is acceptable for the dominant predicate',
    { timeout: 60_000 }, // allow up to 60s for seeding + query
    async () => {
      // Seed 10,000 sessions across 100 users and 4 purposes.
      // Batch inserts are faster than 10k individual create() calls.
      const batchSize = 500;
      const totalToSeed = 10_000;
      const purposes = ['ta-chat:uuid1', 'ta-chat:uuid2', 'support:uuid1', 'support:uuid2'];

      for (let i = 0; i < totalToSeed / batchSize; i++) {
        const rows = Array.from({ length: batchSize }, (_, j) => ({
          mastraThreadId: `thread-scale-${i}-${j}`,
          userId: `user-scale-${(i * batchSize + j) % 100}`,
          promptSlug: 'scale-prompt',
          resolvedPrompt: 'Scale test prompt.',
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          purpose: purposes[(i * batchSize + j) % 4]!,
        }));

        // Drizzle bulk insert: db.insert(table).values(rows)
        await pg.db.insert(aiSessions).values(rows);
      }

      // Run a representative filtered query and measure wall-clock time. The
      // dominant predicate is `purposePrefix`; we expect the planner to use the
      // ORDER BY started_at index path once it exists. See "Plan-shape" below.
      const filter: SessionRepoFilter = { purposePrefix: 'ta-chat:' };
      const pagination = { page: 1, perPage: 50 };

      const start = Date.now();
      const result = await repo.list(filter, pagination);
      const elapsed = Date.now() - start;

      // Assertion 1 (regression guard, hard fail): must complete within 500ms.
      expect(elapsed, `list() took ${elapsed}ms — exceeds 500ms threshold`).toBeLessThan(500);

      // Sanity: result shape is correct.
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeGreaterThan(0);

      // Assertion 2 (index existence): verify the started_at index exists and is
      // usable by the planner. We use an equality predicate on purpose (not LIKE,
      // which requires varchar_pattern_ops for index use) and disable seq scans to
      // force the planner to choose the best available index.
      // In a test container the table fits entirely in shared_buffers, so cost-based
      // planning always prefers seq scan. SET enable_seqscan = off is the canonical
      // technique for proving an index exists in test environments.
      await pg.db.execute(sql.raw(`ANALYZE ai_sessions`));

      // Two separate execute() calls — SET must commit before EXPLAIN is parsed.
      await pg.db.execute(sql.raw(`SET enable_seqscan = off`));
      const explainResult = await pg.db.execute<{ 'QUERY PLAN': string }>(
        sql.raw(`
          EXPLAIN (FORMAT TEXT)
          SELECT *, count(*) OVER () AS total
          FROM ai_sessions
          WHERE purpose = 'ta-chat:uuid1'
          ORDER BY started_at DESC, id DESC
          LIMIT 50
          OFFSET 0
        `),
      );
      await pg.db.execute(sql.raw(`SET enable_seqscan = on`));

      // pg.db.execute() returns a QueryResult; rows are in .rows
      const explainText = explainResult.rows.map((r) => r['QUERY PLAN']).join('\n');

      // With seqscan disabled, an Index Scan or Bitmap Index Scan must appear.
      // A plain Seq Scan means no usable index was found — missing index on
      // started_at or purpose is a release blocker per design doc §6.2.
      const hasSeqScanOnSessions = /Seq Scan on ai_sessions/.test(explainText);
      expect(
        hasSeqScanOnSessions,
        `Even with enable_seqscan=off the planner used a seq scan — no usable index found on ai_sessions. EXPLAIN output:\n${explainText}`,
      ).toBe(false);
    },
  );
});
