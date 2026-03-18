import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ZodType } from 'zod';
import { MastraAgentAdapter } from './mastra.agent.js';
import type { Agent } from '@mastra/core/agent';

function createMockAgent() {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const schema = { parse: vi.fn() } as unknown as ZodType;
      await adapter.generate('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Be concise.',
        outputSchema: schema,
      });

      expect(mockAgent.generate).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
        instructions: 'Be concise.',
        structuredOutput: { schema },
      });
    });

    it('passes toolsets to the underlying agent when provided', async () => {
      const toolsets = { myTool: { action: vi.fn() } };
      await adapter.generate('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        toolsets,
      });

      expect(mockAgent.generate).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
        toolsets,
      });
    });

    it('passes toolsets when outputSchema is also provided', async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const schema = { parse: vi.fn() } as unknown as ZodType;
      const toolsets = { myTool: { action: vi.fn() } };
      await adapter.generate('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        toolsets,
        outputSchema: schema,
      });

      expect(mockAgent.generate).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
        toolsets,
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

    it('passes toolsets to the underlying agent when provided', async () => {
      const toolsets = { myTool: { action: vi.fn() } };
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'hi';
        })(),
      });

      const collected = [];
      for await (const chunk of adapter.stream('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        toolsets,
      })) {
        collected.push(chunk);
      }

      expect(mockAgent.stream).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
        toolsets,
      });
    });

    it('passes toolsets when outputSchema is also provided', async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const schema = { parse: vi.fn() } as unknown as ZodType;
      const toolsets = { myTool: { action: vi.fn() } };
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'hi';
        })(),
      });

      const collected = [];
      for await (const chunk of adapter.stream('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        toolsets,
        outputSchema: schema,
      })) {
        collected.push(chunk);
      }

      expect(mockAgent.stream).toHaveBeenCalledWith('Hello', {
        memory: { thread: 'thread-1', resource: 'user-1' },
        toolsets,
        structuredOutput: { schema },
      });
    });
  });
});
