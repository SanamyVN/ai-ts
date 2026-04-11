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
import { AI_METRICS, type IAiMetrics } from '@/foundation/ai-metrics/ai-metrics.interface.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';

/**
 * Wraps a `@mastra/core` Agent behind the stable `IMastraAgent` interface.
 * All exceptions from the Mastra SDK are caught here and re-thrown as
 * `MastraAdapterError` so callers never see raw Mastra errors.
 *
 * Emits AI cost metrics via `IAiMetrics` after every generate/stream call.
 *
 * @example
 * const adapter = new MastraAgentAdapter(mastraAgent, aiMetrics, aiConfig);
 * const response = await adapter.generate('Hello', { threadId: 't1', resourceId: 'r1' });
 */
@Injectable()
export class MastraAgentAdapter implements IMastraAgent {
  constructor(
    @Inject(MASTRA_CORE_AGENT) private readonly agent: Agent,
    @Inject(AI_METRICS) private readonly aiMetrics: IAiMetrics,
    @Inject(AI_CONFIG) private readonly config: AiConfig,
  ) {}

  async generate(prompt: string, options?: GenerateOptions): Promise<AgentResponse> {
    const start = performance.now();
    const userId = options?.resourceId ?? 'unknown';
    const model = this.config.defaultModel;
    try {
      const base = this.buildBaseOptions(options);
      const result =
        options?.outputSchema !== undefined
          ? await this.agent.generate(prompt, {
              ...base,
              structuredOutput: { schema: options.outputSchema },
            })
          : await this.agent.generate(prompt, base);

      const usage = result.usage;
      this.aiMetrics.recordLlmUsage({
        model,
        userId,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        totalTokens: usage?.totalTokens ?? 0,
        ...(options?.metricsContext !== undefined
          ? { metricsContext: options.metricsContext }
          : {}),
      });
      this.aiMetrics.recordOperation({
        model,
        userId,
        status: 'success',
        latencyMs: performance.now() - start,
        ...(options?.metricsContext !== undefined
          ? { metricsContext: options.metricsContext }
          : {}),
      });

      return {
        text: result.text,
        object: result.object,
        threadId: options?.threadId ?? '',
      };
    } catch (error) {
      this.aiMetrics.recordOperation({
        model,
        userId,
        status: 'error',
        latencyMs: performance.now() - start,
        ...(options?.metricsContext !== undefined
          ? { metricsContext: options.metricsContext }
          : {}),
      });
      throw new MastraAdapterError('generate', error);
    }
  }

  async *stream(prompt: string, options?: GenerateOptions): AsyncIterable<StreamChunk> {
    const start = performance.now();
    const userId = options?.resourceId ?? 'unknown';
    const model = this.config.defaultModel;
    let metricsRecorded = false;
    try {
      const base = this.buildBaseOptions(options);
      const result =
        options?.outputSchema !== undefined
          ? await this.agent.stream(prompt, {
              ...base,
              structuredOutput: { schema: options.outputSchema },
            })
          : await this.agent.stream(prompt, base);

      for await (const chunk of result.textStream) {
        yield { type: 'text-delta', content: chunk };
      }

      const usage = await result.usage;
      const inputTokens = usage?.inputTokens ?? 0;
      const outputTokens = usage?.outputTokens ?? 0;
      const totalTokens = usage?.totalTokens ?? 0;

      this.aiMetrics.recordLlmUsage({
        model,
        userId,
        inputTokens,
        outputTokens,
        totalTokens,
        ...(options?.metricsContext !== undefined
          ? { metricsContext: options.metricsContext }
          : {}),
      });
      this.aiMetrics.recordOperation({
        model,
        userId,
        status: 'success',
        latencyMs: performance.now() - start,
        ...(options?.metricsContext !== undefined
          ? { metricsContext: options.metricsContext }
          : {}),
      });
      metricsRecorded = true;

      yield {
        type: 'finish',
        content: '',
        usage: { inputTokens, outputTokens, totalTokens },
      };
    } catch (error) {
      this.aiMetrics.recordOperation({
        model,
        userId,
        status: 'error',
        latencyMs: performance.now() - start,
        ...(options?.metricsContext !== undefined
          ? { metricsContext: options.metricsContext }
          : {}),
      });
      metricsRecorded = true;
      throw new MastraAdapterError('stream', error);
    } finally {
      if (!metricsRecorded) {
        this.aiMetrics.recordOperation({
          model,
          userId,
          status: 'cancelled',
          latencyMs: performance.now() - start,
          ...(options?.metricsContext !== undefined
            ? { metricsContext: options.metricsContext }
            : {}),
        });
      }
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
