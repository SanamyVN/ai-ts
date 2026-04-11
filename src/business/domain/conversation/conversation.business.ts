import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import {
  MASTRA_AGENT,
  MASTRA_MEMORY,
  type IMastraAgent,
  type IMastraMemory,
  type StreamChunk,
  type GenerateOptions,
} from '@/business/sdk/mastra/mastra.interface.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import { isMastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { ResolvePromptQuery } from '@/business/domain/prompt/client/queries.js';
import {
  CreateSessionCommand,
  FindSessionByIdQuery,
  UpdateSessionCommand,
  UpdateSessionLastMessageCommand,
} from '@/business/domain/session/client/queries.js';
import type { IConversationEngine, SendOptions } from './conversation.interface.js';
import type {
  Conversation,
  ConversationConfig,
  ConversationResponse,
} from './conversation.model.js';
import { ConversationNotFoundError, ConversationSendError } from './conversation.error.js';
import type { MetricsContext } from '@/foundation/ai-metrics/ai-metrics.model.js';
import type { ZodType } from 'zod';

interface ConversationState {
  readonly sessionId: string;
  readonly mastraThreadId: string;
  readonly promptSlug: string;
  readonly resolvedPrompt: string;
  readonly model: string;
  readonly userId: string;
  readonly baseOptions: { readonly threadId: string; readonly resourceId: string };
  readonly metricsContext?: MetricsContext;
}

/**
 * Central orchestrator that composes prompt resolution, session management,
 * and the Mastra agent via the mediator pattern. Never imports domain services
 * directly — all cross-domain calls go through the mediator.
 *
 * A `Conversation` is a runtime-only handle that wraps a persisted `Session`
 * and a configured Mastra agent in memory. `conversationId` maps 1:1 to `sessionId`.
 *
 * @example
 * const engine = new ConversationEngine(mediator, agent, config, memory);
 * const convo = await engine.create({ promptSlug: 'greet', promptParams: {}, userId: 'u1', purpose: 'demo' });
 * const reply = await engine.send(convo.id, 'Hello!');
 */
@Injectable()
export class ConversationEngine implements IConversationEngine {
  private readonly conversations = new Map<string, ConversationState>();

  constructor(
    @Inject(AI_MEDIATOR) private readonly mediator: IMediator,
    @Inject(MASTRA_AGENT) private readonly mastraAgent: IMastraAgent,
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    @Inject(MASTRA_MEMORY) private readonly mastraMemory: IMastraMemory,
  ) {}

  async create(config: ConversationConfig): Promise<Conversation> {
    const prompt = await this.mediator.send(
      new ResolvePromptQuery({ slug: config.promptSlug, params: config.promptParams }),
    );
    const session = await this.mediator.send(
      new CreateSessionCommand({
        userId: config.userId,
        ...(config.tenantId !== undefined ? { tenantId: config.tenantId } : {}),
        promptSlug: config.promptSlug,
        resolvedPrompt: prompt.text,
        purpose: config.purpose,
        ...(config.metricsContext !== undefined
          ? { metadata: { metricsContext: config.metricsContext } }
          : {}),
      }),
    );

    const model = config.model ?? this.config.defaultModel;
    const state: ConversationState = {
      sessionId: session.id,
      mastraThreadId: session.mastraThreadId,
      promptSlug: config.promptSlug,
      resolvedPrompt: prompt.text,
      model,
      userId: config.userId,
      baseOptions: { threadId: session.mastraThreadId, resourceId: config.userId },
      ...(config.metricsContext !== undefined ? { metricsContext: config.metricsContext } : {}),
    };
    this.conversations.set(session.id, state);

    if (config.seedMessages && config.seedMessages.length > 0) {
      await this.mastraMemory.saveMessages(
        session.mastraThreadId,
        config.seedMessages,
        config.userId,
      );
    }

    return {
      id: session.id,
      sessionId: session.id,
      promptSlug: config.promptSlug,
      resolvedPrompt: prompt.text,
      model,
    };
  }

  async send(
    conversationId: string,
    message: string,
    outputSchema?: ZodType,
    promptParams?: Record<string, unknown>,
    toolsets?: Record<string, Record<string, unknown>>,
    sendOptions?: SendOptions,
  ): Promise<ConversationResponse> {
    const state = await this.getOrReconstructState(conversationId);
    const instructions = await this.resolveInstructions(state, promptParams);
    const metricsContext = sendOptions?.metricsContext ?? state.metricsContext;
    const options: GenerateOptions = {
      ...state.baseOptions,
      instructions,
      ...(outputSchema !== undefined && { outputSchema }),
      ...(toolsets !== undefined && { toolsets }),
      ...(metricsContext !== undefined ? { metricsContext } : {}),
    };
    try {
      const response = await this.mastraAgent.generate(message, options);
      if (response.text.length > 0) {
        await this.updateLastMessageBestEffort(state.sessionId, response.text);
      }
      return { text: response.text, object: response.object };
    } catch (error) {
      if (isMastraAdapterError(error)) {
        throw new ConversationSendError(conversationId, error);
      }
      throw error;
    }
  }

  async *stream(
    conversationId: string,
    message: string,
    outputSchema?: ZodType,
    promptParams?: Record<string, unknown>,
    toolsets?: Record<string, Record<string, unknown>>,
    sendOptions?: SendOptions,
  ): AsyncIterable<StreamChunk> {
    const state = await this.getOrReconstructState(conversationId);
    const instructions = await this.resolveInstructions(state, promptParams);
    const metricsContext = sendOptions?.metricsContext ?? state.metricsContext;
    const options: GenerateOptions = {
      ...state.baseOptions,
      instructions,
      ...(outputSchema !== undefined && { outputSchema }),
      ...(toolsets !== undefined && { toolsets }),
      ...(metricsContext !== undefined ? { metricsContext } : {}),
    };
    let accumulated = '';
    try {
      for await (const chunk of this.mastraAgent.stream(message, options)) {
        if (chunk.type === 'text-delta') {
          accumulated += chunk.content;
        }
        if (chunk.type === 'finish' && accumulated.length > 0) {
          await this.updateLastMessageBestEffort(state.sessionId, accumulated);
        }
        yield chunk;
      }
    } catch (error) {
      if (isMastraAdapterError(error)) {
        throw new ConversationSendError(conversationId, error);
      }
      throw error;
    }
  }

  /**
   * Returns the cached state or reconstructs it from the session store.
   * Reconstruction enables multi-instance deployments where a different
   * instance may have created the conversation.
   */
  private async getOrReconstructState(conversationId: string): Promise<ConversationState> {
    const cached = this.conversations.get(conversationId);
    if (cached) {
      return cached;
    }

    let session;
    try {
      session = await this.mediator.send(new FindSessionByIdQuery({ sessionId: conversationId }));
    } catch {
      throw new ConversationNotFoundError(conversationId);
    }

    const raw = session.metadata?.metricsContext;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const restoredContext =
      typeof raw === 'object' &&
      raw !== null &&
      !Array.isArray(raw) &&
      Object.values(raw as Record<string, unknown>).every((v) => typeof v === 'string')
        ? (raw as MetricsContext)
        : undefined;
    const state: ConversationState = {
      sessionId: session.id,
      mastraThreadId: session.mastraThreadId,
      promptSlug: session.promptSlug,
      resolvedPrompt: session.resolvedPrompt,
      model: this.config.defaultModel,
      userId: session.userId,
      baseOptions: { threadId: session.mastraThreadId, resourceId: session.userId },
      ...(restoredContext !== undefined ? { metricsContext: restoredContext } : {}),
    };
    this.conversations.set(session.id, state);
    return state;
  }

  /**
   * Best-effort update of the session's denormalized lastMessage.
   * Failures are silently ignored — the primary response must not be
   * blocked by a metadata write failure.
   */
  private async updateLastMessageBestEffort(sessionId: string, text: string): Promise<void> {
    try {
      await this.mediator.send(
        new UpdateSessionLastMessageCommand({ sessionId, lastMessage: text }),
      );
    } catch {
      // Best-effort: do not let a metadata update failure break the conversation flow.
    }
  }

  /**
   * Resolves instructions for the current call.
   * If promptParams are provided, re-resolves the prompt template and persists the update.
   * Otherwise, uses the cached resolvedPrompt from state.
   */
  private async resolveInstructions(
    state: ConversationState,
    promptParams?: Record<string, unknown>,
  ): Promise<string> {
    if (!promptParams) {
      return state.resolvedPrompt;
    }
    const prompt = await this.mediator.send(
      new ResolvePromptQuery({ slug: state.promptSlug, params: promptParams }),
    );
    // Update in-memory state
    const updatedState: ConversationState = { ...state, resolvedPrompt: prompt.text };
    this.conversations.set(state.sessionId, updatedState);
    // Persist to DB
    await this.mediator.send(
      new UpdateSessionCommand({ sessionId: state.sessionId, resolvedPrompt: prompt.text }),
    );
    return prompt.text;
  }
}
