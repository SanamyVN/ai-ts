import type { MastraMemory } from '@mastra/core/memory';
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
function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (
    content !== null &&
    typeof content === 'object' &&
    'parts' in content &&
    Array.isArray((content as { parts: unknown[] }).parts)
  ) {
    return (content as { parts: { type?: string; text?: string }[] }).parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('');
  }
  return JSON.stringify(content);
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
export class MastraMemoryAdapter implements IMastraMemory {
  constructor(private readonly memory: MastraMemory) {}

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
          role: m.role as 'user' | 'assistant' | 'system',
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
}
