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
      const base = this.buildBaseOptions(options);
      const result = options?.outputSchema !== undefined
        ? await this.agent.generate(prompt, { ...base, structuredOutput: { schema: options.outputSchema } })
        : await this.agent.generate(prompt, base);
      return {
        text: result.text,
        object: result.object,
        threadId: options?.threadId ?? '',
      };
    } catch (error) {
      throw new MastraAdapterError('generate', error);
    }
  }

  async *stream(prompt: string, options?: GenerateOptions): AsyncIterable<StreamChunk> {
    try {
      const base = this.buildBaseOptions(options);
      const result = options?.outputSchema !== undefined
        ? await this.agent.stream(prompt, { ...base, structuredOutput: { schema: options.outputSchema } })
        : await this.agent.stream(prompt, base);
      for await (const chunk of result.textStream) {
        yield { type: 'text-delta', content: chunk };
      }
    } catch (error) {
      throw new MastraAdapterError('stream', error);
    }
  }

  private buildBaseOptions(options?: GenerateOptions) {
    const base: {
      memory?: { thread: string; resource: string };
      instructions?: string;
      // Toolsets are typed loosely in GenerateOptions (Mastra-agnostic interface).
      // Cast to any here so the Mastra overloads accept the value at call sites.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolsets?: any;
    } = {};
    if (options?.threadId !== undefined && options?.resourceId !== undefined) {
      base.memory = { thread: options.threadId, resource: options.resourceId };
    }
    if (options?.instructions !== undefined) {
      base.instructions = options.instructions;
    }
    if (options?.toolsets !== undefined) {
      base.toolsets = options.toolsets;
    }
    return base;
  }
}
