import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { pg } from '../fixture.js';
import { createAiTestContext, type AiTestContext } from '../helpers.js';
import { ConversationEngine } from '@/business/domain/conversation/conversation.business.js';
import {
  ConversationNotFoundError,
  ConversationSendError,
} from '@/business/domain/conversation/conversation.error.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { ResolvePromptQuery } from '@/business/domain/prompt/client/queries.js';
import {
  CreateSessionCommand,
  FindSessionByIdQuery,
} from '@/business/domain/session/client/queries.js';
import { aiConfigSchema } from '@/config.js';
import { z } from 'zod';

/**
 * Routes mediator requests to real PromptService and SessionService implementations.
 * This wires the ConversationEngine through real domain logic while keeping Mastra
 * interactions in mock territory.
 */
function createTestMediator(ctx: AiTestContext): IMediator {
  const mock = {
    send: vi.fn(async (request: unknown) => {
      if (request instanceof ResolvePromptQuery) {
        const result = await ctx.promptService.resolve(request.slug, request.params);
        return result;
      }
      if (request instanceof CreateSessionCommand) {
        ctx.mastraMemory.createThread.mockResolvedValue({
          id: `thread-${Date.now()}`,
          resourceId: request.userId,
        });
        const result = await ctx.sessionService.start({
          userId: request.userId,
          promptSlug: request.promptSlug,
          resolvedPrompt: request.resolvedPrompt,
          purpose: request.purpose,
        });
        return result;
      }
      if (request instanceof FindSessionByIdQuery) {
        const result = await ctx.sessionService.get(request.sessionId);
        return result;
      }
      const ctor: unknown =
        request !== null && typeof request === 'object'
          ? Reflect.get(request, 'constructor')
          : undefined;
      const name: unknown =
        ctor !== null && typeof ctor === 'object' ? Reflect.get(ctor, 'name') : undefined;
      throw new Error(`Unhandled request type: ${String(name)}`);
    }),
    notify: vi.fn(),
  };
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return mock as unknown as IMediator;
}

describe('Conversation / Flow', () => {
  let ctx: AiTestContext;
  let engine: ConversationEngine;

  beforeAll(async () => {
    await pg.start();
  });

  afterAll(async () => {
    await pg.stop();
  });

  beforeEach(async () => {
    ctx = createAiTestContext();

    await ctx.promptService.create({
      name: 'Test Prompt',
      slug: 'test-prompt',
      parameterSchema: { topic: { type: 'string' } },
    });
    const prompt = await ctx.promptService.getBySlug('test-prompt');
    await ctx.promptService.createVersion(prompt.id, {
      template: 'You are a tutor discussing {{topic}}.',
      activate: true,
    });

    const mediator = createTestMediator(ctx);
    const config = aiConfigSchema.parse({});
    engine = new ConversationEngine(mediator, ctx.mastraAgent, config, ctx.mastraMemory);
  });

  afterEach(async () => {
    await pg.truncateAll();
  });

  it('creates a conversation with prompt resolution and session creation', async () => {
    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'math' },
      userId: 'user-1',
      purpose: 'tutoring',
    });

    expect(conversation.id).toBeDefined();
    expect(conversation.promptSlug).toBe('test-prompt');
    expect(conversation.resolvedPrompt).toBe('You are a tutor discussing math.');
  });

  it('sends a message through the Mastra agent', async () => {
    ctx.mastraAgent.generate.mockResolvedValue({
      text: 'Hello! Let me help you with math.',
      object: undefined,
      threadId: 'thread-1',
    });

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'math' },
      userId: 'user-1',
      purpose: 'tutoring',
    });

    const response = await engine.send(conversation.id, 'Help me with algebra');

    expect(response.text).toBe('Hello! Let me help you with math.');
    expect(ctx.mastraAgent.generate).toHaveBeenCalled();
  });

  it('reconstructs conversation state when handle is missing (simulates multi-instance)', async () => {
    ctx.mastraAgent.generate.mockResolvedValue({
      text: 'Reconstructed reply.',
      object: undefined,
      threadId: 'thread-1',
    });

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'history' },
      userId: 'user-2',
      purpose: 'tutoring',
    });

    // Simulate a different instance by creating a fresh engine that has no cached state
    const freshMediator = createTestMediator(ctx);
    const freshEngine = new ConversationEngine(
      freshMediator,
      ctx.mastraAgent,
      aiConfigSchema.parse({}),
      ctx.mastraMemory,
    );

    const response = await freshEngine.send(conversation.id, 'Tell me about Rome.');

    expect(response.text).toBe('Reconstructed reply.');
    expect(ctx.mastraAgent.generate).toHaveBeenCalled();
  });

  it('wraps a MastraAdapterError as ConversationSendError', async () => {
    ctx.mastraAgent.generate.mockRejectedValue(new MastraAdapterError('generate'));

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'science' },
      userId: 'user-3',
      purpose: 'tutoring',
    });

    await expect(engine.send(conversation.id, 'What is gravity?')).rejects.toThrow(
      ConversationSendError,
    );
  });

  it('passes outputSchema as structuredOutput to the Mastra agent via send()', async () => {
    const schema = z.object({ answer: z.string(), confidence: z.number() });

    ctx.mastraAgent.generate.mockResolvedValue({
      text: '',
      object: { answer: 'Paris', confidence: 0.95 },
      threadId: 'thread-1',
    });

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'geography' },
      userId: 'user-1',
      purpose: 'quiz',
    });

    const response = await engine.send(conversation.id, 'What is the capital of France?', schema);

    expect(response.object).toEqual({ answer: 'Paris', confidence: 0.95 });
    expect(ctx.mastraAgent.generate).toHaveBeenCalledWith(
      'What is the capital of France?',
      expect.objectContaining({ outputSchema: schema }),
    );
  });

  it('does not pass outputSchema when none is provided', async () => {
    ctx.mastraAgent.generate.mockResolvedValue({
      text: 'Just plain text.',
      object: undefined,
      threadId: 'thread-1',
    });

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'math' },
      userId: 'user-1',
      purpose: 'tutoring',
    });

    await engine.send(conversation.id, 'Hello');

    const callOptions = ctx.mastraAgent.generate.mock.calls[0]?.[1];
    expect(callOptions?.outputSchema).toBeUndefined();
  });

  it('passes outputSchema to the Mastra agent via stream()', async () => {
    const schema = z.object({ feedback: z.string() });

    const mockChunks = [
      { type: 'text-delta' as const, content: 'chunk' },
      { type: 'finish' as const, content: '' },
    ];
    ctx.mastraAgent.stream.mockReturnValue(
      (async function* () {
        for (const chunk of mockChunks) yield chunk;
      })(),
    );

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'geography' },
      userId: 'user-1',
      purpose: 'quiz',
    });

    const chunks: unknown[] = [];
    for await (const chunk of engine.stream(conversation.id, 'Evaluate my answer', schema)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(ctx.mastraAgent.stream).toHaveBeenCalledWith(
      'Evaluate my answer',
      expect.objectContaining({ outputSchema: schema }),
    );
  });

  it('allows different outputSchema per send() call', async () => {
    const schemaA = z.object({ answer: z.string() });
    const schemaB = z.object({ score: z.number() });

    ctx.mastraAgent.generate
      .mockResolvedValueOnce({ text: '', object: { answer: 'Paris' }, threadId: 'thread-1' })
      .mockResolvedValueOnce({ text: '', object: { score: 95 }, threadId: 'thread-1' });

    const conversation = await engine.create({
      promptSlug: 'test-prompt',
      promptParams: { topic: 'geography' },
      userId: 'user-1',
      purpose: 'quiz',
    });

    await engine.send(conversation.id, 'Question 1', schemaA);
    await engine.send(conversation.id, 'Question 2', schemaB);

    expect(ctx.mastraAgent.generate).toHaveBeenNthCalledWith(
      1,
      'Question 1',
      expect.objectContaining({ outputSchema: schemaA }),
    );
    expect(ctx.mastraAgent.generate).toHaveBeenNthCalledWith(
      2,
      'Question 2',
      expect.objectContaining({ outputSchema: schemaB }),
    );
  });

  it('throws ConversationNotFoundError when sending to an unknown conversation id', async () => {
    await expect(engine.send('00000000-0000-0000-0000-000000000000', 'Hello')).rejects.toThrow(
      ConversationNotFoundError,
    );
  });
});
