import type { MastraMemory } from '@mastra/core/memory';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_MEMORY } from '../mastra.interface.js';
import type {
  IMastraMemory,
  Thread,
  MessageList,
  Pagination,
  ThreadFilter,
} from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/** Builds a `Thread` from a Mastra storage thread, omitting undefined optional fields. */
function toThread(t: {
  id: string;
  resourceId: string;
  title?: string;
  metadata?: Record<string, unknown>;
}): Thread {
  return {
    id: t.id,
    resourceId: t.resourceId,
    ...(t.title !== undefined ? { title: t.title } : {}),
    ...(t.metadata !== undefined ? { metadata: t.metadata } : {}),
  };
}

/**
 * Extracts a plain string from a `MastraMessageContentV2` content object.
 * The format-2 content stores message parts; this joins all text parts.
 */
function isContentWithParts(
  value: unknown,
): value is { parts: { type?: string; text?: string }[] } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'parts' in value &&
    Array.isArray(Reflect.get(value, 'parts'))
  );
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (isContentWithParts(content)) {
    return content.parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text ?? '')
      .join('');
  }
  return JSON.stringify(content);
}

/** Narrows a Mastra SDK role string to the `IMastraMemory` message role union. */
function toMessageRole(role: string): 'user' | 'assistant' | 'system' {
  if (role === 'user' || role === 'assistant' || role === 'system') return role;
  return 'user';
}

/**
 * Wraps a `@mastra/core` MastraMemory instance behind the stable `IMastraMemory`
 * interface. All exceptions from the Mastra SDK are caught here and re-thrown as
 * `MastraAdapterError`.
 *
 * @example
 * const adapter = new MastraMemoryAdapter(memory);
 * const thread = await adapter.createThread('user-123');
 */
@Injectable()
export class MastraMemoryAdapter implements IMastraMemory {
  constructor(@Inject(MASTRA_CORE_MEMORY) private readonly memory: MastraMemory) {}

  async createThread(resourceId: string): Promise<Thread> {
    try {
      const thread = await this.memory.createThread({ resourceId });
      return toThread(thread);
    } catch (error) {
      throw new MastraAdapterError('createThread', error);
    }
  }

  async getMessages(threadId: string, pagination: Pagination): Promise<MessageList> {
    try {
      const result = await this.memory.recall({
        threadId,
        page: pagination.page,
        perPage: pagination.perPage,
        orderBy: { field: 'createdAt', direction: 'ASC' },
      });
      return {
        messages: result.messages.map((m) => ({
          id: m.id,
          role: toMessageRole(m.role),
          content: extractTextContent(m.content),
          createdAt: m.createdAt,
        })),
        page: pagination.page,
        perPage: pagination.perPage,
      };
    } catch (error) {
      throw new MastraAdapterError('getMessages', error);
    }
  }

  async listThreads(filter?: ThreadFilter): Promise<Thread[]> {
    try {
      const result = await this.memory.listThreads({
        ...(filter?.resourceId !== undefined ? { filter: { resourceId: filter.resourceId } } : {}),
      });
      return result.threads.map(toThread);
    } catch (error) {
      throw new MastraAdapterError('listThreads', error);
    }
  }

  async saveMessages(
    threadId: string,
    messages: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[],
  ): Promise<void> {
    try {
      const mastraMessages = messages.map((m) => ({
        id: crypto.randomUUID(),
        role: m.role,
        createdAt: new Date(),
        threadId,
        type: 'text' as const,
        content: {
          format: 2 as const,
          parts: [{ type: 'text' as const, text: m.content }],
        },
      }));
      await this.memory.saveMessages({ messages: mastraMessages });
    } catch (error) {
      throw new MastraAdapterError('saveMessages', error);
    }
  }
}
