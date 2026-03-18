import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MastraAgentAdapter } from './mastra.agent.js';
import type { Agent } from '@mastra/core/agent';

function createMockAgent() {
  return {
    generate: vi.fn().mockResolvedValue({ text: 'response', object: undefined }),
    stream: vi.fn().mockResolvedValue({
      textStream: (async function* () {
        yield 'hi';
      })(),
    }),
  } as unknown as Agent;
}

describe('MastraAgentAdapter', () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let adapter: MastraAgentAdapter;

  beforeEach(() => {
    mockAgent = createMockAgent();
    adapter = new MastraAgentAdapter(mockAgent);
  });

  describe('generate', () => {
    it('passes instructions to the underlying agent when provided', async () => {
      await adapter.generate('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'You are a math tutor.',
      });

      expect(mockAgent.generate).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
        instructions: 'You are a math tutor.',
      });
    });

    it('does not pass instructions when not provided', async () => {
      await adapter.generate('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
      });

      expect(mockAgent.generate).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
      });
    });

    it('passes both instructions and structuredOutput when both provided', async () => {
      const schema = { parse: vi.fn() };
      await adapter.generate('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Be concise.',
        outputSchema: schema as any,
      });

      expect(mockAgent.generate).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
        instructions: 'Be concise.',
        structuredOutput: { schema },
      });
    });
  });

  describe('stream', () => {
    it('passes instructions to the underlying agent when provided', async () => {
      const collected = [];
      for await (const chunk of adapter.stream('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'You are a math tutor.',
      })) {
        collected.push(chunk);
      }

      expect(mockAgent.stream).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
        instructions: 'You are a math tutor.',
      });
    });
  });
});
