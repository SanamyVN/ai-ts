import { describe, expect, it, vi } from 'vitest';
import { aiSessionMessages } from './session-message.schema.js';
import type { SessionMessageRepoFilter } from './session-message.interface.js';
import { createMockSessionMessageRepository } from './session-message.testing.js';
import { SessionMessageDrizzleRepository } from './session-message.db.js';

describe('aiSessionMessages schema', () => {
  it('table definition exposes id, sessionId, purpose, and sentAt columns', () => {
    expect(aiSessionMessages.id).toBeDefined();
    expect(aiSessionMessages.sessionId).toBeDefined();
    expect(aiSessionMessages.purpose).toBeDefined();
    expect(aiSessionMessages.sentAt).toBeDefined();
  });
});

describe('createMockSessionMessageRepository', () => {
  it('returns stubs for all three interface methods', () => {
    const mock = createMockSessionMessageRepository();
    expect(mock.append).toBeDefined();
    expect(mock.count).toBeDefined();
    expect(mock.countBySession).toBeDefined();
  });
});

describe('SessionMessageRepoFilter shape', () => {
  it('accepts all optional filter fields without type error', () => {
    const filter: SessionMessageRepoFilter = {
      purpose: 'ta-chat:abc',
      purposePrefix: 'ta-chat:',
      sentAtGte: new Date('2026-01-01T00:00:00.000Z'),
      sentAtLt: new Date('2026-02-01T00:00:00.000Z'),
    };
    expect(filter).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Mock builder
// ---------------------------------------------------------------------------

/**
 * Builds a mock postgres client whose `db` property supports the chains used
 * by all three repository methods:
 *
 * append  → insert → values → onConflictDoNothing → execute
 * count   → select → from → where → (resolves to [{total}])
 * countBySession → select → from → where → groupBy → (resolves to [{sessionId, total}[]])
 */
function createMockSessionMessageClient(options?: {
  countRow?: { total: number };
  countBySessionRows?: { sessionId: string; total: number }[];
  appendConflict?: boolean; // unused at runtime; controls mock setup semantics only
  /** Controls which chain the first select() call routes to. Default: 'count'. */
  firstSelectChain?: 'count' | 'countBySession';
}) {
  // ── append chain ──────────────────────────────────────────────────────────
  const appendExecuteFn = vi.fn().mockResolvedValue(undefined);
  const onConflictDoNothingFn = vi.fn(() => ({ execute: appendExecuteFn }));
  const valuesFn = vi.fn(() => ({ onConflictDoNothing: onConflictDoNothingFn }));
  const insertFn = vi.fn(() => ({ values: valuesFn }));

  // ── count chain ───────────────────────────────────────────────────────────
  const countWhereFn = vi.fn().mockResolvedValue([options?.countRow ?? { total: 0 }]);
  const countFromFn = vi.fn(() => ({ where: countWhereFn }));
  const countSelectFn = vi.fn(() => ({ from: countFromFn }));

  // ── countBySession chain ──────────────────────────────────────────────────
  const countBySessionGroupByFn = vi.fn().mockResolvedValue(options?.countBySessionRows ?? []);
  const countBySessionWhereFn = vi.fn(() => ({ groupBy: countBySessionGroupByFn }));
  const countBySessionFromFn = vi.fn(() => ({ where: countBySessionWhereFn }));
  const countBySessionSelectFn = vi.fn(() => ({ from: countBySessionFromFn }));

  // Route select() calls: count tests call select() once (→ countFromFn);
  // countBySession tests call select() once (→ countBySessionFromFn).
  // The `firstSelectChain` option lets callers control which chain the first
  // select() call resolves to — default is 'count' to match count() tests.
  let selectCallCount = 0;
  const selectFn = vi.fn(() => {
    selectCallCount += 1;
    const firstChain = options?.firstSelectChain ?? 'count';
    if (selectCallCount === 1) {
      return firstChain === 'countBySession'
        ? { from: countBySessionFromFn }
        : { from: countFromFn };
    }
    return firstChain === 'count' ? { from: countBySessionFromFn } : { from: countFromFn };
  });

  const db = {
    insert: insertFn,
    select: selectFn,
  };

  return {
    client: {
      db,
      connect: async () => {
        return;
      },
      disconnect: async () => {
        return;
      },
      isHealthy: async () => true,
    },
    insertFn,
    valuesFn,
    onConflictDoNothingFn,
    appendExecuteFn,
    countSelectFn,
    countFromFn,
    countWhereFn,
    countBySessionSelectFn,
    countBySessionFromFn,
    countBySessionWhereFn,
    countBySessionGroupByFn,
  };
}

// ---------------------------------------------------------------------------
// append
// ---------------------------------------------------------------------------

describe('SessionMessageDrizzleRepository.append', () => {
  it('inserts a row using ON CONFLICT DO NOTHING and resolves void', async () => {
    const mock = createMockSessionMessageClient();
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    const explicitSentAt = new Date('2026-04-01T10:00:00.000Z');

    await expect(
      repo.append({
        id: 'msg-001',
        sessionId: 'sess-1',
        purpose: 'ta-chat:abc',
        sentAt: explicitSentAt,
      }),
    ).resolves.toBeUndefined();

    expect(mock.insertFn).toHaveBeenCalledTimes(1);
    expect(mock.valuesFn).toHaveBeenCalledTimes(1);
    expect(mock.onConflictDoNothingFn).toHaveBeenCalledTimes(1);
    expect(mock.appendExecuteFn).toHaveBeenCalledTimes(1);

    // The implementation must pass the caller-supplied sentAt directly to
    // drizzle's values() — it must not call NOW() server-side or omit the field.
    // (§1 "Data model", §1 "When sent_at is captured")
    expect(mock.valuesFn).toHaveBeenCalledWith(expect.objectContaining({ sentAt: explicitSentAt }));
  });

  it('resolves void on a duplicate id (idempotent — ON CONFLICT DO NOTHING)', async () => {
    // Same test setup — ON CONFLICT DO NOTHING means the execute still succeeds
    // (the DB simply inserts 0 rows). The repository must not throw.
    const mock = createMockSessionMessageClient();
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    const sentAt = new Date('2026-04-01T10:00:00.000Z');

    await expect(
      repo.append({
        id: 'msg-001',
        sessionId: 'sess-1',
        purpose: 'ta-chat:abc',
        sentAt,
      }),
    ).resolves.toBeUndefined();
    // Call a second time with the same id — both must resolve without throwing.
    await expect(
      repo.append({
        id: 'msg-001',
        sessionId: 'sess-1',
        purpose: 'ta-chat:abc',
        sentAt,
      }),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// count
// ---------------------------------------------------------------------------

describe('SessionMessageDrizzleRepository.count', () => {
  it('returns 0 when no rows match the filter', async () => {
    const mock = createMockSessionMessageClient({ countRow: { total: 0 } });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    const result = await repo.count({});

    expect(result).toBe(0);
  });

  it('returns the COUNT when rows exist', async () => {
    const mock = createMockSessionMessageClient({ countRow: { total: 17 } });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    const result = await repo.count({ purposePrefix: 'ta-chat:' });

    expect(result).toBe(17);
  });

  it('passes undefined to WHERE when filter is empty (no conditions)', async () => {
    const mock = createMockSessionMessageClient({ countRow: { total: 0 } });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    await repo.count({});

    expect(mock.countWhereFn).toHaveBeenCalledWith(undefined);
  });

  it('composes purposePrefix + sentAtGte + sentAtLt into one WHERE', async () => {
    const mock = createMockSessionMessageClient({ countRow: { total: 3 } });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    await repo.count({
      purposePrefix: 'ta-chat:',
      sentAtGte: new Date('2026-04-01T00:00:00.000Z'),
      sentAtLt: new Date('2026-05-01T00:00:00.000Z'),
    });

    expect(mock.countWhereFn).toHaveBeenCalledTimes(1);
    expect(mock.countWhereFn).toHaveBeenCalledWith(expect.anything());
  });

  it('applies purpose exact-match filter', async () => {
    const mock = createMockSessionMessageClient({ countRow: { total: 2 } });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    await repo.count({ purpose: 'ta-chat:exact-id' });

    expect(mock.countWhereFn).toHaveBeenCalledWith(expect.anything());
  });

  it('applies sentAtGte filter alone', async () => {
    const mock = createMockSessionMessageClient({ countRow: { total: 9 } });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    await repo.count({ sentAtGte: new Date('2026-04-01T00:00:00.000Z') });

    expect(mock.countWhereFn).toHaveBeenCalledWith(expect.anything());
  });

  it('applies sentAtLt filter alone', async () => {
    const mock = createMockSessionMessageClient({ countRow: { total: 4 } });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    await repo.count({ sentAtLt: new Date('2026-05-01T00:00:00.000Z') });

    expect(mock.countWhereFn).toHaveBeenCalledWith(expect.anything());
  });
});

// ---------------------------------------------------------------------------
// countBySession
// ---------------------------------------------------------------------------

describe('SessionMessageDrizzleRepository.countBySession', () => {
  it('returns an empty Map when given an empty input array', async () => {
    const mock = createMockSessionMessageClient({ countBySessionRows: [] });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    const result = await repo.countBySession([]);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('returns a Map with correct counts for multiple sessions', async () => {
    const mock = createMockSessionMessageClient({
      countBySessionRows: [
        { sessionId: 'sess-a', total: 5 },
        { sessionId: 'sess-b', total: 12 },
      ],
      firstSelectChain: 'countBySession',
    });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    const result = await repo.countBySession(['sess-a', 'sess-b', 'sess-c']);

    expect(result.get('sess-a')).toBe(5);
    expect(result.get('sess-b')).toBe(12);
    // sess-c has no events — absent from map (caller defaults to 0)
    expect(result.has('sess-c')).toBe(false);
  });

  it('does not include sessions with no events in the returned Map', async () => {
    const mock = createMockSessionMessageClient({
      countBySessionRows: [{ sessionId: 'sess-a', total: 3 }],
      firstSelectChain: 'countBySession',
    });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    const result = await repo.countBySession(['sess-a', 'sess-no-events']);

    expect(result.size).toBe(1);
    expect(result.has('sess-no-events')).toBe(false);
  });

  it('calls groupBy(sessionId) so PostgreSQL does not reject the aggregate query', async () => {
    const mock = createMockSessionMessageClient({
      countBySessionRows: [{ sessionId: 'sess-x', total: 7 }],
      firstSelectChain: 'countBySession',
    });
    // @ts-expect-error test-only client stub
    const repo = new SessionMessageDrizzleRepository(mock.client);

    await repo.countBySession(['sess-x']);

    expect(mock.countBySessionGroupByFn).toHaveBeenCalledTimes(1);
    expect(mock.countBySessionGroupByFn).toHaveBeenCalledWith(aiSessionMessages.sessionId);
  });
});
