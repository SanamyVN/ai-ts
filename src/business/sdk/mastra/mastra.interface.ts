import { createToken } from '@sanamyvn/foundation/di/core/tokens';

export interface AgentResponse {
  readonly text: string;
  readonly object?: unknown;
  readonly threadId: string;
}

export interface StreamChunk {
  readonly type: 'text-delta' | 'tool-call' | 'finish';
  readonly content: string;
}

export interface GenerateOptions {
  readonly threadId?: string;
  readonly resourceId?: string;
  readonly outputSchema?: unknown;
}

export interface Thread {
  readonly id: string;
  readonly resourceId: string;
  readonly title?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface Message {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly createdAt: Date;
}

export interface Pagination {
  readonly page: number;
  readonly perPage: number;
}

export interface MessageList {
  readonly messages: Message[];
  readonly page: number;
  readonly perPage: number;
}

export interface ThreadFilter {
  readonly resourceId?: string;
}

export interface IMastraAgent {
  generate(prompt: string, options?: GenerateOptions): Promise<AgentResponse>;
  stream(prompt: string, options?: GenerateOptions): AsyncIterable<StreamChunk>;
}

export interface IMastraMemory {
  createThread(resourceId: string): Promise<Thread>;
  getMessages(threadId: string, pagination: Pagination): Promise<MessageList>;
  listThreads(filter?: ThreadFilter): Promise<Thread[]>;
}

export const MASTRA_AGENT = createToken<IMastraAgent>('MASTRA_AGENT');
export const MASTRA_MEMORY = createToken<IMastraMemory>('MASTRA_MEMORY');
