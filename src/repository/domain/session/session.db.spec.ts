import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { aiSessions } from './session.schema.js';
import type { SessionRecord } from './session.model.js';
import type { SessionRepoFilter } from './session.interface.js';
import { SessionDrizzleRepository } from './session.db.js';
import { SessionNotFoundRepoError } from './session.error.js';
import { createMockSessionRepository } from './session.testing.js';

function createSessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    mastraThreadId: 'thread-1',
    userId: 'user-1',
    tenantId: null,
    promptSlug: 'prompt-1',
    resolvedPrompt: 'resolved prompt',
    purpose: 'testing',
    status: 'active',
    title: null,
    metadata: null,
    startedAt: new Date('2026-04-07T00:00:00.000Z'),
    endedAt: null,
    lastMessage: null,
    lastMessageAt: null,
    ...overrides,
  };
}

interface SessionReturning {
  returning: () => Promise<SessionRecord[]>;
}

interface SessionUpdateChain {
  where: (condition: unknown) => SessionReturning;
}

interface SessionUpdateQuery {
  set: (values: { title: string }) => SessionUpdateChain;
}

interface SessionDeleteQuery {
  where: (condition: unknown) => SessionReturning;
}

interface MockSessionDb {
  update: (table: typeof aiSessions) => SessionUpdateQuery;
  delete: (table: typeof aiSessions) => SessionDeleteQuery;
}

function createMockPostgresClient(options?: {
  updateResult?: SessionRecord[];
  deleteResult?: SessionRecord[];
}) {
  const updateReturning = vi.fn().mockResolvedValue(options?.updateResult ?? []);
  const updateWhere: SessionUpdateChain['where'] = vi.fn(() => ({ returning: updateReturning }));
  const updateSet: SessionUpdateQuery['set'] = vi.fn(() => ({ where: updateWhere }));
  const update: MockSessionDb['update'] = vi.fn(() => ({ set: updateSet }));

  const deleteReturning = vi.fn().mockResolvedValue(options?.deleteResult ?? []);
  const deleteWhere: SessionDeleteQuery['where'] = vi.fn(() => ({ returning: deleteReturning }));
  const deleteQuery: MockSessionDb['delete'] = vi.fn(() => ({ where: deleteWhere }));

  const db: MockSessionDb = {
    update,
    delete: deleteQuery,
  };

  const client = {
    db,
    connect: async () => {
      return;
    },
    disconnect: async () => {
      return;
    },
    isHealthy: async () => true,
  };

  return {
    client,
    update,
    updateSet,
    updateWhere,
    updateReturning,
    deleteQuery,
    deleteWhere,
    deleteReturning,
  };
}

describe('SessionDrizzleRepository', () => {
  it('mock factory returns all methods', () => {
    const mock = createMockSessionRepository();
    expect(mock.create).toBeDefined();
    expect(mock.findById).toBeDefined();
    expect(mock.list).toBeDefined();
    expect(mock.updateStatus).toBeDefined();
    expect(mock.updateResolvedPrompt).toBeDefined();
    expect(mock.updateLastMessage).toBeDefined();
    expect(mock.updateTitle).toBeDefined();
    expect(mock.deleteById).toBeDefined();
  });

  it('updates a session title and returns the updated record', async () => {
    const record = createSessionRecord({ title: 'New title' });
    const db = createMockPostgresClient({ updateResult: [record] });
    // @ts-expect-error test-only client stub for unit testing the repository logic
    const repo = new SessionDrizzleRepository(db.client);

    const updated = await repo.updateTitle(record.id, 'New title');

    expect(updated).toEqual(record);
    expect(db.update).toHaveBeenCalledWith(aiSessions);
    expect(db.updateSet).toHaveBeenCalledWith({ title: 'New title' });
    expect(db.updateWhere).toHaveBeenCalledWith(eq(aiSessions.id, record.id));
    expect(db.updateReturning).toHaveBeenCalledTimes(1);
  });

  it('throws SessionNotFoundRepoError when updating a missing session title', async () => {
    const db = createMockPostgresClient({ updateResult: [] });
    // @ts-expect-error test-only client stub for unit testing the repository logic
    const repo = new SessionDrizzleRepository(db.client);

    await expect(repo.updateTitle('missing-session', 'Missing')).rejects.toThrow(
      SessionNotFoundRepoError,
    );
  });

  it('deletes a session by id', async () => {
    const record = createSessionRecord();
    const db = createMockPostgresClient({ deleteResult: [record] });
    // @ts-expect-error test-only client stub for unit testing the repository logic
    const repo = new SessionDrizzleRepository(db.client);

    await expect(repo.deleteById(record.id)).resolves.toBeUndefined();
    expect(db.deleteQuery).toHaveBeenCalledWith(aiSessions);
    expect(db.deleteWhere).toHaveBeenCalledWith(eq(aiSessions.id, record.id));
    expect(db.deleteReturning).toHaveBeenCalledTimes(1);
  });

  it('throws SessionNotFoundRepoError when deleting a missing session', async () => {
    const db = createMockPostgresClient({ deleteResult: [] });
    // @ts-expect-error test-only client stub for unit testing the repository logic
    const repo = new SessionDrizzleRepository(db.client);

    await expect(repo.deleteById('missing-session')).rejects.toThrow(SessionNotFoundRepoError);
  });
});

describe('SessionRepoFilter new fields — compile-time shape check', () => {
  it('accepts purposePrefix, startedAtGte, and startedAtLt without type error', () => {
    const filter: SessionRepoFilter = {
      tenantId: 'tenant-1',
      purposePrefix: 'ta-chat:',
      startedAtGte: new Date('2026-01-01T00:00:00.000Z'),
      startedAtLt: new Date('2026-02-01T00:00:00.000Z'),
    };
    expect(filter).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Extended mock for list() tests
// ---------------------------------------------------------------------------

function createListMockClient(options?: { rows?: SessionRecord[] }) {
  const offsetFn = vi.fn().mockResolvedValue(options?.rows ?? []);
  const limitFn = vi.fn(() => ({ offset: offsetFn }));
  const orderByFn = vi.fn(() => ({ limit: limitFn }));
  const whereFn = vi.fn(() => ({ orderBy: orderByFn }));
  const fromFn = vi.fn(() => ({ where: whereFn }));
  const selectFn = vi.fn(() => ({ from: fromFn }));

  const db = {
    select: selectFn,
    // Stubs for existing tests that use other chains
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
    })),
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
    selectFn,
    fromFn,
    whereFn,
    orderByFn,
    limitFn,
    offsetFn,
  };
}

// ---------------------------------------------------------------------------
// list() — new filters
// ---------------------------------------------------------------------------

describe('SessionDrizzleRepository.list — new filters and pagination', () => {
  const baseRecord = createSessionRecord();

  it('applies purposePrefix as a LIKE predicate (WHERE clause is defined)', async () => {
    const mock = createListMockClient({ rows: [baseRecord] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list({ purposePrefix: 'ta-chat:' }, { page: 1, perPage: 10 });

    const [whereArg] = mock.whereFn.mock.calls[0] as unknown as [unknown];
    expect(whereArg).toBeDefined();
  });

  it('applies startedAtGte filter (WHERE clause is defined)', async () => {
    const mock = createListMockClient({ rows: [baseRecord] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list(
      { startedAtGte: new Date('2026-01-01T00:00:00.000Z') },
      { page: 1, perPage: 10 },
    );

    const [whereArg] = mock.whereFn.mock.calls[0] as unknown as [unknown];
    expect(whereArg).toBeDefined();
  });

  it('applies startedAtLt filter (WHERE clause is defined)', async () => {
    const mock = createListMockClient({ rows: [baseRecord] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list(
      { startedAtLt: new Date('2026-02-01T00:00:00.000Z') },
      { page: 1, perPage: 10 },
    );

    const [whereArg] = mock.whereFn.mock.calls[0] as unknown as [unknown];
    expect(whereArg).toBeDefined();
  });

  it('composes tenantId + purposePrefix + startedAtGte + startedAtLt into one WHERE', async () => {
    const mock = createListMockClient({ rows: [baseRecord] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list(
      {
        tenantId: 'tenant-1',
        purposePrefix: 'ta-chat:',
        startedAtGte: new Date('2026-01-01T00:00:00.000Z'),
        startedAtLt: new Date('2026-02-01T00:00:00.000Z'),
      },
      { page: 1, perPage: 10 },
    );

    expect(mock.whereFn).toHaveBeenCalledTimes(1);
    const [whereArg] = mock.whereFn.mock.calls[0] as unknown as [unknown];
    expect(whereArg).toBeDefined();
  });

  it('passes undefined to WHERE when filter is empty (no conditions)', async () => {
    const mock = createListMockClient({ rows: [] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list({}, { page: 1, perPage: 10 });

    const [whereArg] = mock.whereFn.mock.calls[0] as unknown as [unknown];
    expect(whereArg).toBeUndefined();
  });

  it('calls orderBy exactly once for deterministic ordering', async () => {
    const mock = createListMockClient({ rows: [] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list({}, { page: 1, perPage: 10 });

    expect(mock.orderByFn).toHaveBeenCalledTimes(1);
  });

  it('orderBy receives two column expressions (started_at DESC, id DESC)', async () => {
    const mock = createListMockClient({ rows: [] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list({}, { page: 1, perPage: 10 });

    const args = mock.orderByFn.mock.calls[0] as unknown[];
    expect(args).toHaveLength(2);
  });

  it('applies limit = perPage', async () => {
    const mock = createListMockClient({ rows: [] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list({}, { page: 1, perPage: 25 });

    expect(mock.limitFn).toHaveBeenCalledWith(25);
  });

  it('applies offset 0 for page 1', async () => {
    const mock = createListMockClient({ rows: [] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list({}, { page: 1, perPage: 10 });

    expect(mock.offsetFn).toHaveBeenCalledWith(0);
  });

  it('applies offset 20 for page 3 with perPage 10', async () => {
    const mock = createListMockClient({ rows: [] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    await repo.list({}, { page: 3, perPage: 10 });

    expect(mock.offsetFn).toHaveBeenCalledWith(20);
  });

  it('returns empty array on last page (items.length < perPage sentinel)', async () => {
    const mock = createListMockClient({ rows: [] });
    // @ts-expect-error test-only client stub
    const repo = new SessionDrizzleRepository(mock.client);

    const result = await repo.list({}, { page: 99, perPage: 10 });

    expect(result).toEqual([]);
  });
});
