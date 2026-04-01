import { describe, expect, it, beforeEach, type Mock } from 'vitest';
import { createMockMediator, type MockMediator } from '@sanamyvn/foundation/mediator/testing';
import type { Sendable } from '@sanamyvn/foundation/mediator/request';
import { ConversationEngine } from './conversation.business.js';
import { ConversationNotFoundError, ConversationSendError } from './conversation.error.js';
import {
  createMockMastraAgent,
  createMockMastraMemory,
} from '@/business/sdk/mastra/mastra.testing.js';
import { MastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { ResolvePromptQuery } from '@/business/domain/prompt/client/queries.js';
import {
  CreateSessionCommand,
  FindSessionByIdQuery,
  UpdateSessionCommand,
  UpdateSessionLastMessageCommand,
} from '@/business/domain/session/client/queries.js';
import type { AiConfig } from '@/config.js';

/** Re-type the send mock so `mockResolvedValueOnce` accepts arbitrary values. */
type PermissiveSendMock = Mock<(request: Sendable, signal?: AbortSignal) => Promise<unknown>>;

const DEFAULT_CONFIG: AiConfig = {
  defaultModel: 'anthropic/claude-sonnet-4-20250514',
  prompt: { maxVersions: 50 },
  session: { transcriptPageSize: 100 },
  embeddingModel: 'openai/text-embedding-3-small',
  embeddingDimension: 1536,
};

const RESOLVED_PROMPT = { slug: 'greet', version: 1, text: 'Hello {{name}}' };

const SESSION = {
  id: 'session-1',
  mastraThreadId: 'thread-1',
  userId: 'user-1',
  tenantId: null,
  promptSlug: 'greet',
  resolvedPrompt: 'Hello {{name}}',
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
  let memory: ReturnType<typeof createMockMastraMemory>;

  beforeEach(() => {
    mediator = createMockMediator();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    send = mediator.send as PermissiveSendMock;
    agent = createMockMastraAgent();
    memory = createMockMastraMemory();
    engine = new ConversationEngine(mediator, agent, DEFAULT_CONFIG, memory);
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
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

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

      const call = send.mock.calls[1];
      if (!call) throw new Error('Expected second mediator call');
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const sessionCommand = call[0] as InstanceType<typeof CreateSessionCommand>;
      expect(sessionCommand).toHaveProperty('tenantId', 'tenant-1');
    });

    it('saves seed messages to the thread after session creation', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);
      memory.saveMessages.mockResolvedValueOnce(undefined);

      const seedMessages = [
        { role: 'assistant' as const, content: 'Welcome! How can I help?' },
        { role: 'user' as const, content: 'I need help with billing.' },
      ];

      await engine.create({
        promptSlug: 'greet',
        promptParams: { name: 'World' },
        userId: 'user-1',
        purpose: 'test',
        seedMessages,
      });

      expect(memory.saveMessages).toHaveBeenCalledTimes(1);
      expect(memory.saveMessages).toHaveBeenCalledWith('thread-1', seedMessages, 'user-1');
    });

    it('does not call saveMessages when seedMessages is omitted', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      await engine.create({
        promptSlug: 'greet',
        promptParams: { name: 'World' },
        userId: 'user-1',
        purpose: 'test',
      });

      expect(memory.saveMessages).not.toHaveBeenCalled();
    });

    it('does not call saveMessages when seedMessages is an empty array', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      await engine.create({
        promptSlug: 'greet',
        promptParams: { name: 'World' },
        userId: 'user-1',
        purpose: 'test',
        seedMessages: [],
      });

      expect(memory.saveMessages).not.toHaveBeenCalled();
    });

    it('propagates saveMessages errors from create', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);
      memory.saveMessages.mockRejectedValueOnce(new Error('Memory write failed'));

      await expect(
        engine.create({
          promptSlug: 'greet',
          promptParams: { name: 'World' },
          userId: 'user-1',
          purpose: 'test',
          seedMessages: [{ role: 'assistant' as const, content: 'Welcome!' }],
        }),
      ).rejects.toThrow('Memory write failed');
    });
  });

  describe('send', () => {
    it('delegates to Mastra agent with correct threadId', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

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
        instructions: 'Hello {{name}}',
      });
      expect(response).toEqual({ text: 'Hi there!', object: undefined });
    });

    it('reconstructs state when handle is missing (multi-instance scenario)', async () => {
      send.mockResolvedValue(SESSION);

      agent.generate.mockResolvedValue({
        text: 'Reconstructed!',
        object: undefined,
        threadId: 'thread-1',
      });

      const response = await engine.send('session-1', 'Hello');

      expect(send).toHaveBeenCalledWith(expect.any(FindSessionByIdQuery));
      expect(agent.generate).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Hello {{name}}',
      });
      expect(response.text).toBe('Reconstructed!');
    });

    it('throws ConversationNotFoundError when session lookup fails', async () => {
      send.mockRejectedValue(new Error('Session not found'));

      await expect(engine.send('missing-id', 'Hello')).rejects.toThrow(ConversationNotFoundError);
    });

    it('wraps MastraAdapterError in ConversationSendError', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      agent.generate.mockRejectedValue(new MastraAdapterError('generate'));

      await expect(engine.send('session-1', 'Hello')).rejects.toThrow(ConversationSendError);
    });

    it('re-throws non-Mastra errors without wrapping', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

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

    it('passes resolvedPrompt as instructions to agent', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      agent.generate.mockResolvedValue({
        text: 'Hi there!',
        object: undefined,
        threadId: 'thread-1',
      });

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: { name: 'World' },
        userId: 'user-1',
        purpose: 'test',
      });

      await engine.send(convo.id, 'Hello');

      expect(agent.generate).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Hello {{name}}',
      });
    });

    it('re-resolves prompt when promptParams provided and passes new instructions', async () => {
      // Create conversation
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      agent.generate.mockResolvedValue({
        text: 'Updated!',
        object: undefined,
        threadId: 'thread-1',
      });

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: { name: 'World' },
        userId: 'user-1',
        purpose: 'test',
      });

      // send() with new promptParams triggers re-resolution
      const newResolvedPrompt = { slug: 'greet', version: 2, text: 'Updated prompt' };
      send
        .mockResolvedValueOnce(newResolvedPrompt) // ResolvePromptQuery
        .mockResolvedValueOnce(undefined); // UpdateSessionCommand

      await engine.send(convo.id, 'Hello', undefined, { name: 'Updated' });

      // Should have called ResolvePromptQuery with new params
      expect(send).toHaveBeenCalledWith(expect.any(ResolvePromptQuery));
      // Should have persisted updated resolvedPrompt
      expect(send).toHaveBeenCalledWith(expect.any(UpdateSessionCommand));
      // Should pass new resolved prompt as instructions
      expect(agent.generate).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Updated prompt',
      });
    });

    it('passes toolsets to agent.generate when provided', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      agent.generate.mockResolvedValue({
        text: 'Tool response!',
        object: undefined,
        threadId: 'thread-1',
      });

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      const toolsets = { myTools: { search: {} } };
      await engine.send(convo.id, 'Hello', undefined, undefined, toolsets);

      expect(agent.generate).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Hello {{name}}',
        toolsets,
      });
    });

    it('does not include toolsets in options when not provided (backwards compat)', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

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

      await engine.send(convo.id, 'Hello');

      expect(agent.generate).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Hello {{name}}',
      });
    });

    it('dispatches UpdateSessionLastMessageCommand after successful generate', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      agent.generate.mockResolvedValue({
        text: 'AI response text',
        object: undefined,
        threadId: 'thread-1',
      });

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      // Allow the UpdateSessionLastMessageCommand call to succeed
      send.mockResolvedValueOnce(undefined);

      await engine.send(convo.id, 'Hello');

      expect(send).toHaveBeenCalledWith(expect.any(UpdateSessionLastMessageCommand));
      const lastMessageCall = send.mock.calls.find(
        (call) => call[0] instanceof UpdateSessionLastMessageCommand,
      );
      expect(lastMessageCall).toBeDefined();
      if (lastMessageCall) {
        expect(lastMessageCall[0]).toHaveProperty('sessionId', 'session-1');
        expect(lastMessageCall[0]).toHaveProperty('lastMessage', 'AI response text');
      }
    });

    it('does not dispatch UpdateSessionLastMessageCommand when response text is empty', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      agent.generate.mockResolvedValue({
        text: '',
        object: { answer: 42 },
        threadId: 'thread-1',
      });

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      await engine.send(convo.id, 'Hello');

      const lastMessageCall = send.mock.calls.find(
        (call) => call[0] instanceof UpdateSessionLastMessageCommand,
      );
      expect(lastMessageCall).toBeUndefined();
    });

    it('does not throw when UpdateSessionLastMessageCommand fails after send', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      agent.generate.mockResolvedValue({
        text: 'AI response text',
        object: undefined,
        threadId: 'thread-1',
      });

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      // Make the UpdateSessionLastMessageCommand call fail
      send.mockRejectedValueOnce(new Error('DB write failed'));

      // send() should still return successfully — lastMessage update is best-effort
      const response = await engine.send(convo.id, 'Hello');

      expect(response).toEqual({ text: 'AI response text', object: undefined });
    });
  });

  describe('stream', () => {
    it('delegates to Mastra agent stream with correct threadId', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

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
        instructions: 'Hello {{name}}',
      });
      expect(collected).toEqual(chunks);
    });

    it('reconstructs state when handle is missing', async () => {
      send.mockResolvedValue(SESSION);

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

    it('re-resolves prompt when promptParams provided in stream', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      const chunks = [{ type: 'text-delta' as const, content: 'Hi' }];
      agent.stream.mockReturnValue(
        (async function* () {
          for (const chunk of chunks) yield chunk;
        })(),
      );

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: { name: 'World' },
        userId: 'user-1',
        purpose: 'test',
      });

      const newResolvedPrompt = { slug: 'greet', version: 2, text: 'Updated stream prompt' };
      send.mockResolvedValueOnce(newResolvedPrompt).mockResolvedValueOnce(undefined);

      const collected = [];
      for await (const chunk of engine.stream(convo.id, 'Hello', undefined, { name: 'Updated' })) {
        collected.push(chunk);
      }

      expect(send).toHaveBeenCalledWith(expect.any(ResolvePromptQuery));
      expect(agent.stream).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Updated stream prompt',
      });
    });

    it('passes toolsets to agent.stream when provided', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      const chunks = [{ type: 'text-delta' as const, content: 'Tool stream!' }];
      agent.stream.mockReturnValue(
        (async function* () {
          for (const chunk of chunks) yield chunk;
        })(),
      );

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      const toolsets = { myTools: { search: {} } };
      const collected = [];
      for await (const chunk of engine.stream(convo.id, 'Hello', undefined, undefined, toolsets)) {
        collected.push(chunk);
      }

      expect(agent.stream).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Hello {{name}}',
        toolsets,
      });
      expect(collected).toEqual(chunks);
    });

    it('does not include toolsets in stream options when not provided (backwards compat)', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      const chunks = [{ type: 'finish' as const, content: '' }];
      agent.stream.mockReturnValue(
        (async function* () {
          for (const chunk of chunks) yield chunk;
        })(),
      );

      const convo = await engine.create({
        promptSlug: 'greet',
        promptParams: {},
        userId: 'user-1',
        purpose: 'test',
      });

      for await (const _ of engine.stream(convo.id, 'Hello')) {
        // consume
      }

      expect(agent.stream).toHaveBeenCalledWith('Hello', {
        threadId: 'thread-1',
        resourceId: 'user-1',
        instructions: 'Hello {{name}}',
      });
    });

    it('dispatches UpdateSessionLastMessageCommand on finish chunk with accumulated text', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

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

      // Allow the UpdateSessionLastMessageCommand call to succeed
      send.mockResolvedValueOnce(undefined);

      const collected = [];
      for await (const chunk of engine.stream(convo.id, 'Hello')) {
        collected.push(chunk);
      }

      expect(collected).toEqual(chunks);
      expect(send).toHaveBeenCalledWith(expect.any(UpdateSessionLastMessageCommand));
      const lastMessageCall = send.mock.calls.find(
        (call) => call[0] instanceof UpdateSessionLastMessageCommand,
      );
      expect(lastMessageCall).toBeDefined();
      if (lastMessageCall) {
        expect(lastMessageCall[0]).toHaveProperty('sessionId', 'session-1');
        expect(lastMessageCall[0]).toHaveProperty('lastMessage', 'Hello world');
      }
    });

    it('does not dispatch UpdateSessionLastMessageCommand when no text was accumulated', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      const chunks = [{ type: 'finish' as const, content: '' }];

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

      for await (const _ of engine.stream(convo.id, 'Hello')) {
        // consume
      }

      const lastMessageCall = send.mock.calls.find(
        (call) => call[0] instanceof UpdateSessionLastMessageCommand,
      );
      expect(lastMessageCall).toBeUndefined();
    });

    it('does not throw when UpdateSessionLastMessageCommand fails during stream', async () => {
      send.mockResolvedValueOnce(RESOLVED_PROMPT).mockResolvedValueOnce(SESSION);

      const chunks = [
        { type: 'text-delta' as const, content: 'Hi' },
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

      // Make the UpdateSessionLastMessageCommand call fail
      send.mockRejectedValueOnce(new Error('DB write failed'));

      const collected = [];
      for await (const chunk of engine.stream(convo.id, 'Hello')) {
        collected.push(chunk);
      }

      // All chunks should still be yielded
      expect(collected).toEqual(chunks);
    });
  });
});
