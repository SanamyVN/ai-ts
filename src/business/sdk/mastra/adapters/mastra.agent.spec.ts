import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ZodType } from 'zod';
import { MastraAgentAdapter } from './mastra.agent.js';
import type { Agent } from '@mastra/core/agent';
import { createMockAiMetrics } from '@/foundation/ai-metrics/ai-metrics.testing.js';
import type { AiConfig } from '@/config.js';

function createMockAgent() {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    generate: vi.fn().mockResolvedValue({
      text: 'response',
      object: undefined,
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    }),
    stream: vi.fn().mockResolvedValue({
      textStream: (async function* () {
        yield 'hi';
      })(),
      usage: Promise.resolve({ inputTokens: 5, outputTokens: 15, totalTokens: 20 }),
    }),
  } as unknown as Agent;
}

const TEST_CONFIG: AiConfig = {
  defaultModel: 'openai/gpt-4o-mini',
  prompt: { maxVersions: 50 },
  session: { transcriptPageSize: 100 },
  embeddingModel: 'openai/text-embedding-3-small',
  embeddingDimension: 1536,
};

describe('MastraAgentAdapter', () => {
  let mockAgent: ReturnType<typeof createMockAgent>;
  let adapter: MastraAgentAdapter;
  let mockMetrics: ReturnType<typeof createMockAiMetrics>;

  beforeEach(() => {
    mockAgent = createMockAgent();
    mockMetrics = createMockAiMetrics();
    adapter = new MastraAgentAdapter(mockAgent, mockMetrics, TEST_CONFIG);
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

    it('emits recordLlmUsage with correct token counts on successful generate', async () => {
      await adapter.generate('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        metricsContext: { 'ai.operation': 'exam_conversation', 'user.role': 'student' },
      });

      expect(mockMetrics.recordLlmUsage).toHaveBeenCalledWith({
        model: 'openai/gpt-4o-mini',
        userId: 'user-1',
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        metricsContext: { 'ai.operation': 'exam_conversation', 'user.role': 'student' },
      });
    });

    it('emits recordOperation with success on successful generate', async () => {
      await adapter.generate('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
      });

      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'openai/gpt-4o-mini',
          userId: 'user-1',
          status: 'success',
        }),
      );
      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({ latencyMs: expect.any(Number) }),
      );
    });

    it('emits recordOperation with error when generate fails', async () => {
      mockAgent.generate = vi.fn().mockRejectedValue(new Error('LLM down'));

      await expect(
        adapter.generate('Hello', {
          threadId: 'thread-1',
          resourceId: 'user-1',
          metricsContext: { 'ai.operation': 'exam_conversation' },
        }),
      ).rejects.toThrow();

      expect(mockMetrics.recordLlmUsage).not.toHaveBeenCalled();
      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'openai/gpt-4o-mini',
          userId: 'user-1',
          status: 'error',
          metricsContext: { 'ai.operation': 'exam_conversation' },
        }),
      );
    });

    it('uses "unknown" as userId when resourceId is not provided', async () => {
      await adapter.generate('Hello');

      expect(mockMetrics.recordLlmUsage).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'unknown' }),
      );
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
        usage: Promise.resolve({ inputTokens: 5, outputTokens: 15, totalTokens: 20 }),
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
        usage: Promise.resolve({ inputTokens: 5, outputTokens: 15, totalTokens: 20 }),
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

    it('emits recordLlmUsage with correct token counts after stream completes', async () => {
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'hello';
          yield ' world';
        })(),
        usage: Promise.resolve({ inputTokens: 5, outputTokens: 15, totalTokens: 20 }),
      });

      const collected = [];
      for await (const chunk of adapter.stream('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        metricsContext: { 'ai.operation': 'ta_chat' },
      })) {
        collected.push(chunk);
      }

      expect(mockMetrics.recordLlmUsage).toHaveBeenCalledWith({
        model: 'openai/gpt-4o-mini',
        userId: 'user-1',
        inputTokens: 5,
        outputTokens: 15,
        totalTokens: 20,
        metricsContext: { 'ai.operation': 'ta_chat' },
      });
    });

    it('emits recordOperation with success after stream completes', async () => {
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'hi';
        })(),
        usage: Promise.resolve({ inputTokens: 5, outputTokens: 15, totalTokens: 20 }),
      });

      for await (const _ of adapter.stream('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
      })) {
        // consume
      }

      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'openai/gpt-4o-mini',
          userId: 'user-1',
          status: 'success',
          latencyMs: expect.any(Number),
        }),
      );
    });

    it('yields a finish chunk with usage after stream completes', async () => {
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'data';
        })(),
        usage: Promise.resolve({ inputTokens: 5, outputTokens: 15, totalTokens: 20 }),
      });

      const collected = [];
      for await (const chunk of adapter.stream('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
      })) {
        collected.push(chunk);
      }

      const finishChunk = collected.find((c) => c.type === 'finish');
      expect(finishChunk).toBeDefined();
      expect(finishChunk?.usage).toEqual({ inputTokens: 5, outputTokens: 15, totalTokens: 20 });
    });

    it('emits recordOperation with error when stream throws', async () => {
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'partial';
          throw new Error('Stream broke');
        })(),
        usage: Promise.resolve({ inputTokens: 0, outputTokens: 0, totalTokens: 0 }),
      });

      await expect(async () => {
        for await (const _ of adapter.stream('Hello', {
          threadId: 'thread-1',
          resourceId: 'user-1',
          metricsContext: { 'ai.operation': 'exam_conversation' },
        })) {
          // consume
        }
      }).rejects.toThrow();

      expect(mockMetrics.recordLlmUsage).not.toHaveBeenCalled();
      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'openai/gpt-4o-mini',
          userId: 'user-1',
          status: 'error',
          metricsContext: { 'ai.operation': 'exam_conversation' },
        }),
      );
    });

    it('uses "unknown" as userId when resourceId is not provided in stream', async () => {
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'hi';
        })(),
        usage: Promise.resolve({ inputTokens: 1, outputTokens: 2, totalTokens: 3 }),
      });

      for await (const _ of adapter.stream('Hello')) {
        // consume
      }

      expect(mockMetrics.recordLlmUsage).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'unknown' }),
      );
    });

    it('emits recordOperation with cancelled when stream is abandoned via break', async () => {
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'hello';
          yield ' world';
          yield ' more';
        })(),
        usage: Promise.resolve({ inputTokens: 5, outputTokens: 15, totalTokens: 20 }),
      });

      for await (const chunk of adapter.stream('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        metricsContext: { 'ai.operation': 'ta_chat' },
      })) {
        if (chunk.content === 'hello') break; // cancel after first chunk
      }

      // Should NOT emit LLM usage (no token data on cancellation)
      expect(mockMetrics.recordLlmUsage).not.toHaveBeenCalled();
      // Should emit operation with cancelled status
      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'openai/gpt-4o-mini',
          userId: 'user-1',
          status: 'cancelled',
          latencyMs: expect.any(Number),
          metricsContext: { 'ai.operation': 'ta_chat' },
        }),
      );
    });

    it('does not emit cancelled when stream completes normally', async () => {
      mockAgent.stream = vi.fn().mockResolvedValue({
        textStream: (async function* () {
          yield 'hi';
        })(),
        usage: Promise.resolve({ inputTokens: 1, outputTokens: 2, totalTokens: 3 }),
      });

      for await (const _ of adapter.stream('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
      })) {
        // consume all
      }

      // Should have success, not cancelled
      expect(mockMetrics.recordOperation).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' }),
      );
      expect(mockMetrics.recordOperation).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
    });
  });
});
