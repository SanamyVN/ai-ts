import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MastraMemory } from '@mastra/core/memory';
import { MastraMemoryAdapter } from './mastra.memory.js';
import { MastraAdapterError } from '../mastra.error.js';

function createMockMemory() {
  return {
    createThread: vi.fn(),
    recall: vi.fn(),
    listThreads: vi.fn(),
    deleteThread: vi.fn(),
    saveMessages: vi.fn().mockResolvedValue({ messages: [] }),
  };
}

describe('MastraMemoryAdapter', () => {
  let mockMemory: ReturnType<typeof createMockMemory>;
  let adapter: MastraMemoryAdapter;

  beforeEach(() => {
    mockMemory = createMockMemory();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    adapter = new MastraMemoryAdapter(mockMemory as unknown as MastraMemory);
  });

  describe('saveMessages', () => {
    it('calls memory.saveMessages with correctly formatted MastraDBMessages', async () => {
      await adapter.saveMessages(
        'thread-1',
        [{ role: 'assistant', content: 'Welcome!' }],
        'user-1',
      );

      expect(mockMemory.saveMessages).toHaveBeenCalledTimes(1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const callArgs = vi.mocked(mockMemory.saveMessages).mock.calls[0]!;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const { messages } = callArgs[0] as { messages: Record<string, unknown>[] };
      expect(messages).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const msg = messages[0]!;
      expect(msg['threadId']).toBe('thread-1');
      expect(msg['resourceId']).toBe('user-1');
      expect(msg['role']).toBe('assistant');
      expect(msg['content']).toEqual({
        format: 2,
        parts: [{ type: 'text', text: 'Welcome!' }],
      });
      expect(typeof msg['id']).toBe('string');
      expect(String(msg['id']).length).toBeGreaterThan(0);
      expect(msg['createdAt']).toBeInstanceOf(Date);
    });

    it('maps multiple messages into a single saveMessages call', async () => {
      await adapter.saveMessages(
        'thread-2',
        [
          { role: 'assistant', content: 'Hello' },
          { role: 'user', content: 'Hi there' },
          { role: 'assistant', content: 'How can I help?' },
        ],
        'user-1',
      );

      expect(mockMemory.saveMessages).toHaveBeenCalledTimes(1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const rawCall = vi.mocked(mockMemory.saveMessages).mock.calls[0]!;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const callArgs = rawCall[0] as { messages: Record<string, unknown>[] };
      expect(callArgs.messages).toHaveLength(3);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(callArgs.messages[0]!['role']).toBe('assistant');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(callArgs.messages[0]!['threadId']).toBe('thread-2');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(callArgs.messages[1]!['role']).toBe('user');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(callArgs.messages[1]!['content']).toEqual({
        format: 2,
        parts: [{ type: 'text', text: 'Hi there' }],
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(callArgs.messages[2]!['role']).toBe('assistant');
    });

    it('assigns a unique id to each message', async () => {
      await adapter.saveMessages(
        'thread-3',
        [
          { role: 'assistant', content: 'First' },
          { role: 'assistant', content: 'Second' },
        ],
        'user-1',
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const rawCall = vi.mocked(mockMemory.saveMessages).mock.calls[0]!;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const callArgs = rawCall[0] as { messages: Record<string, unknown>[] };
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const ids = callArgs.messages.map((m) => m['id'] as string);

      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(ids[1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('calls saveMessages with an empty array when no messages are provided', async () => {
      await adapter.saveMessages('thread-4', [], 'user-1');

      expect(mockMemory.saveMessages).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const rawCall = vi.mocked(mockMemory.saveMessages).mock.calls[0]!;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const callArgs = rawCall[0] as { messages: unknown[] };
      expect(callArgs.messages).toHaveLength(0);
    });

    it('wraps errors from the underlying memory as MastraAdapterError', async () => {
      const cause = new Error('database connection lost');
      mockMemory.saveMessages.mockRejectedValueOnce(cause);

      const promise = adapter.saveMessages(
        'thread-5',
        [{ role: 'assistant', content: 'Hello' }],
        'user-1',
      );

      await expect(promise).rejects.toThrow('Mastra operation failed: saveMessages');
    });

    it('throws MastraAdapterError with the original cause', async () => {
      const cause = new Error('timeout');
      mockMemory.saveMessages.mockRejectedValueOnce(cause);

      try {
        await adapter.saveMessages('thread-6', [{ role: 'assistant', content: 'Hello' }], 'user-1');
        expect.fail('Expected MastraAdapterError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MastraAdapterError);
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        expect((error as MastraAdapterError).operation).toBe('saveMessages');
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        expect((error as MastraAdapterError).cause).toBe(cause);
      }
    });
  });

  describe('deleteThread', () => {
    it('calls memory.deleteThread with the provided thread id', async () => {
      mockMemory.deleteThread.mockResolvedValue(undefined);

      await adapter.deleteThread('thread-1');

      expect(mockMemory.deleteThread).toHaveBeenCalledWith('thread-1');
    });

    it('wraps underlying deleteThread failures as MastraAdapterError', async () => {
      const cause = new Error('delete failed');
      mockMemory.deleteThread.mockRejectedValueOnce(cause);

      await expect(adapter.deleteThread('thread-1')).rejects.toThrow(
        'Mastra operation failed: deleteThread',
      );
    });
  });

  describe('getMessages', () => {
    it('maps Mastra result.messages to items and passes result.total through', async () => {
      const createdAt = new Date('2026-01-01T10:00:00.000Z');
      mockMemory.recall.mockResolvedValue({
        messages: [{ id: 'msg-1', role: 'user', content: 'hello', createdAt }],
        total: 7,
        page: 0,
        perPage: 10,
        hasMore: false,
      });

      const result = await adapter.getMessages('thread-abc', { page: 1, perPage: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe('msg-1');
      expect(result.total).toBe(7);
      // messages key must not exist on the result
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      expect((result as unknown as Record<string, unknown>)['messages']).toBeUndefined();
    });

    it('returns items: [] and total: 0 for an empty thread', async () => {
      mockMemory.recall.mockResolvedValue({
        messages: [],
        total: 0,
        page: 0,
        perPage: 10,
        hasMore: false,
      });

      const result = await adapter.getMessages('thread-empty', { page: 1, perPage: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('subtracts 1 from public page before forwarding to recall (page: 1 → recall page: 0)', async () => {
      mockMemory.recall.mockResolvedValue({
        messages: [],
        total: 0,
        page: 0,
        perPage: 20,
        hasMore: false,
      });

      await adapter.getMessages('thread-1', { page: 1, perPage: 20 });

      expect(mockMemory.recall).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }));
    });

    it('subtracts 1 from public page before forwarding to recall (page: 3 → recall page: 2)', async () => {
      mockMemory.recall.mockResolvedValue({
        messages: [],
        total: 0,
        page: 2,
        perPage: 20,
        hasMore: false,
      });

      await adapter.getMessages('thread-1', { page: 3, perPage: 20 });

      expect(mockMemory.recall).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });

    it('returns items in the order Mastra provides them (createdAt ASC)', async () => {
      const earlierDate = new Date('2026-01-01T09:00:00.000Z');
      const laterDate = new Date('2026-01-01T10:00:00.000Z');
      mockMemory.recall.mockResolvedValue({
        messages: [
          { id: 'msg-early', role: 'user', content: 'first', createdAt: earlierDate },
          { id: 'msg-late', role: 'user', content: 'second', createdAt: laterDate },
        ],
        total: 2,
        page: 0,
        perPage: 10,
        hasMore: false,
      });

      const result = await adapter.getMessages('thread-ordered', { page: 1, perPage: 10 });

      expect(result.items[0]?.id).toBe('msg-early');
      expect(result.items[1]?.id).toBe('msg-late');
    });

    it('page-walk behavioral: page: 1 returns the earliest message in a 25-message thread', async () => {
      // Seed 25 messages in createdAt ASC order. The mock returns whatever we
      // configure — this test asserts that the adapter passes page: 0 to recall()
      // when the caller requests page: 1, so the first item is msg-0 (earliest),
      // not msg-10 (what a buggy adapter forwarding page: 1 → recall(1) would return).
      //
      // Design §6.2: "Page-walk reaches the first message: seed a thread with
      // 25 messages; call getMessages(threadId, { page: 1, perPage: 10 }); assert
      // the first item's id is the earliest message in the thread."
      //
      // The spy assertions above verify the off-by-one at the call level; this test
      // independently catches the defect at the result level — if the spy assertions
      // were removed, this test would still fail whenever the adapter regresses to
      // forwarding pagination.page directly to recall().
      const page1Messages = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user' as const,
        content: `message ${i}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, i, 0)),
      }));
      const page2Messages = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${10 + i}`,
        role: 'user' as const,
        content: `message ${10 + i}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 10 + i, 0)),
      }));

      // Mock returns the correct first-page slice when recall(page: 0) is called.
      // A buggy adapter that calls recall(page: 1) would need a different mock
      // return — but we control the mock, so we configure what page 0 should return.
      mockMemory.recall.mockImplementation(
        (args: { page: number; perPage: number; threadId: string; orderBy: unknown }) => {
          if (args.page === 0) {
            return Promise.resolve({
              messages: page1Messages,
              total: 25,
              page: 0,
              perPage: 10,
              hasMore: true,
            });
          }
          if (args.page === 1) {
            return Promise.resolve({
              messages: page2Messages,
              total: 25,
              page: 1,
              perPage: 10,
              hasMore: true,
            });
          }
          return Promise.resolve({
            messages: [],
            total: 25,
            page: args.page,
            perPage: 10,
            hasMore: false,
          });
        },
      );

      const result = await adapter.getMessages('thread-25', { page: 1, perPage: 10 });

      // The first item must be msg-0 (earliest in the thread).
      // If the adapter forwarded page: 1 to recall(), recall(1) returns page2Messages
      // starting with msg-10 — this assertion would catch that regression.
      expect(result.items[0]?.id).toBe('msg-0');
      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(25);
    });

    it('wraps recall errors as MastraAdapterError', async () => {
      mockMemory.recall.mockRejectedValueOnce(new Error('storage unavailable'));

      await expect(adapter.getMessages('thread-err', { page: 1, perPage: 10 })).rejects.toThrow(
        'Mastra operation failed: getMessages',
      );
    });
  });
});
