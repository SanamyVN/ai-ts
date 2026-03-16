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
    engine = new ConversationEngine(mediator, ctx.mastraAgent, config);
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
    // Use a prompt without parameterSchema so reconstruction (which resolves with {}) works
    await ctx.promptService.create({ name: 'Simple Prompt', slug: 'simple-prompt' });
    const simple = await ctx.promptService.getBySlug('simple-prompt');
    await ctx.promptService.createVersion(simple.id, {
      template: 'You are a helpful assistant.',
      activate: true,
    });

    ctx.mastraAgent.generate.mockResolvedValue({
      text: 'Reconstructed reply.',
      object: undefined,
      threadId: 'thread-1',
    });

    const conversation = await engine.create({
      promptSlug: 'simple-prompt',
      promptParams: {},
      userId: 'user-2',
      purpose: 'tutoring',
    });

    // Simulate a different instance by creating a fresh engine that has no cached state
    const freshMediator = createTestMediator(ctx);
    const freshEngine = new ConversationEngine(
      freshMediator,
      ctx.mastraAgent,
      aiConfigSchema.parse({}),
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

  it('throws ConversationNotFoundError when sending to an unknown conversation id', async () => {
    await expect(engine.send('00000000-0000-0000-0000-000000000000', 'Hello')).rejects.toThrow(
      ConversationNotFoundError,
    );
  });
});
