import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { aiSessions } from './session.schema.js';
import type { SessionRecord } from './session.model.js';
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
