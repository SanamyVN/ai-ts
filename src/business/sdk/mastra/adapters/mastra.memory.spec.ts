import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MastraMemory } from '@mastra/core/memory';
import { MastraMemoryAdapter } from './mastra.memory.js';
import { MastraAdapterError } from '../mastra.error.js';

function createMockMemory() {
  return {
    createThread: vi.fn(),
    recall: vi.fn(),
    listThreads: vi.fn(),
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
      await adapter.saveMessages('thread-1', [{ role: 'assistant', content: 'Welcome!' }]);

      expect(mockMemory.saveMessages).toHaveBeenCalledTimes(1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const callArgs = vi.mocked(mockMemory.saveMessages).mock.calls[0]!;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const { messages } = callArgs[0] as { messages: Record<string, unknown>[] };
      expect(messages).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const msg = messages[0]!;
      expect(msg['threadId']).toBe('thread-1');
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
      await adapter.saveMessages('thread-2', [
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Hi there' },
        { role: 'assistant', content: 'How can I help?' },
      ]);

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
      await adapter.saveMessages('thread-3', [
        { role: 'assistant', content: 'First' },
        { role: 'assistant', content: 'Second' },
      ]);

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
      await adapter.saveMessages('thread-4', []);

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

      const promise = adapter.saveMessages('thread-5', [{ role: 'assistant', content: 'Hello' }]);

      await expect(promise).rejects.toThrow('Mastra operation failed: saveMessages');
    });

    it('throws MastraAdapterError with the original cause', async () => {
      const cause = new Error('timeout');
      mockMemory.saveMessages.mockRejectedValueOnce(cause);

      try {
        await adapter.saveMessages('thread-6', [{ role: 'assistant', content: 'Hello' }]);
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
});
