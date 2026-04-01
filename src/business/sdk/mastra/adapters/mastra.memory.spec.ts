import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MastraMemory } from '@mastra/core/memory';
import { MastraMemoryAdapter } from './mastra.memory.js';

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
  });
});
