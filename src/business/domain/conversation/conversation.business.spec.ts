import { describe, expect, it, beforeEach, type Mock } from 'vitest';
import { createMockMediator, type MockMediator } from '@sanamyvn/foundation/mediator/testing';
import type { Sendable } from '@sanamyvn/foundation/mediator/request';
import { ConversationEngine } from './conversation.business.js';
import { ConversationNotFoundError, ConversationSendError } from './conversation.error.js';
import { createMockMastraAgent } from '@/business/sdk/mastra/mastra.testing.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { ResolvePromptQuery } from '@/business/domain/prompt/client/queries.js';
import {
  CreateSessionCommand,
  FindSessionByIdQuery,
} from '@/business/domain/session/client/queries.js';
import type { AiConfig } from '@/config.js';

/** Re-type the send mock so `mockResolvedValueOnce` accepts arbitrary values. */
type PermissiveSendMock = Mock<(request: Sendable, signal?: AbortSignal) => Promise<unknown>>;

const DEFAULT_CONFIG: AiConfig = {
  defaultModel: 'anthropic/claude-sonnet-4-20250514',
  prompt: { maxVersions: 50 },
  session: { transcriptPageSize: 100 },
};

const RESOLVED_PROMPT = { slug: 'greet', version: 1, text: 'Hello {{name}}' };

const SESSION = {
  id: 'session-1',
  mastraThreadId: 'thread-1',
  userId: 'user-1',
  tenantId: null,
  promptSlug: 'greet',
  purpose: 'test',
  status: 'active',
  metadata: null,
  startedAt: new Date(),
  endedAt: null,
};

describe('ConversationEngine', () => {
  let engine: ConversationEngine;
  let mediator: MockMediator;
  let send: PermissiveSendMock;
  let agent: ReturnType<typeof createMockMastraAgent>;

  beforeEach(() => {
    mediator = createMockMediator();
    send = mediator.send as PermissiveSendMock;
    agent = createMockMastraAgent();
    engine = new ConversationEngine(mediator, agent, DEFAULT_CONFIG);
  });

  describe('create', () => {
    it('resolves prompt and creates session via mediator', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      const result = await engine.create({
        promptSlug: 'greet',
        promptParams: { name: 'World' },
        userId: 'user-1',
        purpose: 'test',
      });

      expect(send).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenCalledWith(expect.any(ResolvePromptQuery));
      expect(send).toHaveBeenCalledWith(expect.any(CreateSessionCommand));
      expect(result).toEqual({
        id: 'session-1',
        sessionId: 'session-1',
        promptSlug: 'greet',
        resolvedPrompt: 'Hello {{name}}',
        model: 'anthropic/claude-sonnet-4-20250514',
      });
    });

    it('uses custom model when provided', async () => {
      send
        .mockResolvedValueOnce(RESOLVED_PROMPT)
        .mockResolvedValueOnce(SESSION);

      const result = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
        model: 'openai/gpt-4o',
      });

      expect(result.model).toBe('openai/gpt-4o');
    });

    it('passes tenantId to session creation when provided', async () => {
      send
        .mockResolvedValueOnce(RESOLVED_PROMPT)
        .mockResolvedValueOnce({ ...SESSION, tenantId: 'tenant-1' });

      await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        tenantId: 'tenant-1',
        purpose: 'test',
      });

      const sessionCommand = send.mock.calls[1]![0] as InstanceType<
        typeof CreateSessionCommand
      >;
      expect(sessionCommand).toHaveProperty('tenantId', 'tenant-1');
    });
  });

  describe('send', () => {
    it('delegates to Mastra agent with correct threadId', async () => {
      send
        .mockResolvedValueOnce(RESOLVED_PROMPT)
        .mockResolvedValueOnce(SESSION);

      agent.generate.mockResolvedValue({
        text: 'Hi there!',
        object: undefined,
        threadId: 'thread-1',
      });

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      const response = await engine.send(convo.id, 'Hello');

      expect(agent.generate).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
      });
      expect(response).toEqual({ text: 'Hi there!', object: undefined });
    });

    it('reconstructs state when handle is missing (multi-instance scenario)', async () => {
      send.mockImplementation(async (request) => {
        if (request instanceof FindSessionByIdQuery) {
          return SESSION;
        }
        if (request instanceof ResolvePromptQuery) {
          return RESOLVED_PROMPT;
        }
        throw new Error(`Unexpected request: ${request.type}`);
      });

      agent.generate.mockResolvedValue({
        text: 'Reconstructed!',
        object: undefined,
        threadId: 'thread-1',
      });

      const response = await engine.send('session-1', 'Hello');

      expect(send).toHaveBeenCalledWith(expect.any(FindSessionByIdQuery));
      expect(send).toHaveBeenCalledWith(expect.any(ResolvePromptQuery));
      expect(agent.generate).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
      });
      expect(response.text).toBe('Reconstructed!');
    });

    it('throws ConversationNotFoundError when session lookup fails', async () => {
      send.mockRejectedValue(new Error('Session not found'));

      await expect(engine.send('missing-id', 'Hello')).rejects.toThrow(
        ConversationNotFoundError,
      );
    });

    it('wraps MastraAdapterError in ConversationSendError', async () => {
      send
        .mockResolvedValueOnce(RESOLVED_PROMPT)
        .mockResolvedValueOnce(SESSION);

      await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      agent.generate.mockRejectedValue(new MastraAdapterError('generate'));

      await expect(engine.send('session-1', 'Hello')).rejects.toThrow(
        ConversationSendError,
      );
    });

    it('re-throws non-Mastra errors without wrapping', async () => {
      send
        .mockResolvedValueOnce(RESOLVED_PROMPT)
        .mockResolvedValueOnce(SESSION);

      await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      const networkError = new TypeError('Network failure');
      agent.generate.mockRejectedValue(networkError);

      await expect(engine.send('session-1', 'Hello')).rejects.toThrow(networkError);
    });
  });

  describe('stream', () => {
    it('delegates to Mastra agent stream with correct threadId', async () => {
      send
        .mockResolvedValueOnce(RESOLVED_PROMPT)
        .mockResolvedValueOnce(SESSION);

      const chunks = [
        { type: 'text-delta' as const, content: 'Hello' },
        { type: 'text-delta' as const, content: ' world' },
        { type: 'finish' as const, content: '' },
      ];

      agent.stream.mockReturnValue(
        (async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        })(),
      );

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      const collected = [];
      for await (const chunk of engine.stream(convo.id, 'Hello')) {
        collected.push(chunk);
      }

      expect(agent.stream).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
      });
      expect(collected).toEqual(chunks);
    });

    it('reconstructs state when handle is missing', async () => {
      send.mockImplementation(async (request) => {
        if (request instanceof FindSessionByIdQuery) {
          return SESSION;
        }
        if (request instanceof ResolvePromptQuery) {
          return RESOLVED_PROMPT;
        }
        throw new Error(`Unexpected request: ${request.type}`);
      });

      agent.stream.mockReturnValue(
        (async function* () {
          yield { type: 'text-delta' as const, content: 'Hi' };
        })(),
      );

      const collected = [];
      for await (const chunk of engine.stream('session-1', 'Hello')) {
        collected.push(chunk);
      }

      expect(send).toHaveBeenCalledWith(expect.any(FindSessionByIdQuery));
      expect(collected).toHaveLength(1);
    });
  });
});
