import type { Agent } from '@mastra/core/agent';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_AGENT } from '../mastra.interface.js';
import type {
  IMastraAgent,
  AgentResponse,
  StreamChunk,
  GenerateOptions,
} from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/core` Agent behind the stable `IMastraAgent` interface.
 * All exceptions from the Mastra SDK are caught here and re-thrown as
 * `MastraAdapterError` so callers never see raw Mastra errors.
 *
 * @example
 * const adapter = new MastraAgentAdapter(mastraAgent);
 * const response = await adapter.generate('Hello', { threadId: 't1', resourceId: 'r1' });
 */
@Injectable()
export class MastraAgentAdapter implements IMastraAgent {
  constructor(@Inject(MASTRA_CORE_AGENT) private readonly agent: Agent) {}

  async generate(prompt: string, options?: GenerateOptions): Promise<AgentResponse> {
    try {
      const result = await this.agent.generate(prompt, {
        ...(options?.threadId !== undefined && options?.resourceId !== undefined
          ? { memory: { thread: options.threadId, resource: options.resourceId } }
          : {}),
        ...(options?.outputSchema !== undefined
          ? {
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              structuredOutput: options.outputSchema as never,
            }
          : {}),
      });
      return {
        text: result.text,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        object: result.object as unknown,
        // FullOutput does not expose threadId; return the requested threadId if known
        threadId: options?.threadId ?? '',
      };
    } catch (error) {
      throw new MastraAdapterError('generate', error);
    }
  }

  async *stream(prompt: string, options?: GenerateOptions): AsyncIterable<StreamChunk> {
    try {
      const result = await this.agent.stream(prompt, {
        ...(options?.threadId !== undefined && options?.resourceId !== undefined
          ? { memory: { thread: options.threadId, resource: options.resourceId } }
          : {}),
        ...(options?.outputSchema !== undefined
          ? {
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              structuredOutput: options.outputSchema as never,
            }
          : {}),
      });
      // textStream is a WHATWG ReadableStream<string>, which supports for-await-of in Node 18+
      for await (const chunk of result.textStream) {
        yield { type: 'text-delta', content: chunk };
      }
    } catch (error) {
      throw new MastraAdapterError('stream', error);
    }
  }
}
