import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import {
  MASTRA_AGENT,
  type IMastraAgent,
  type StreamChunk,
  type GenerateOptions,
} from '@/business/sdk/mastra/mastra.interface.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import { isMastraAdapterError } from '@/business/sdk/mastra/mastra.error.js';
import { ResolvePromptQuery } from '@/business/domain/prompt/client/queries.js';
import {
  CreateSessionCommand,
  FindSessionByIdQuery,
} from '@/business/domain/session/client/queries.js';
import type { IConversationEngine } from './conversation.interface.js';
import type {
  Conversation,
  ConversationConfig,
  ConversationResponse,
} from './conversation.model.js';
import { ConversationNotFoundError, ConversationSendError } from './conversation.error.js';
import type { ZodType } from 'zod';

interface ConversationState {
  readonly sessionId: string;
  readonly mastraThreadId: string;
  readonly promptSlug: string;
  readonly resolvedPrompt: string;
  readonly model: string;
  readonly userId: string;
  readonly baseOptions: { readonly threadId: string; readonly resourceId: string };
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
 * const engine = new ConversationEngine(mediator, agent, config);
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
    };
    this.conversations.set(session.id, state);

    return {
      id: session.id,
      sessionId: session.id,
      promptSlug: config.promptSlug,
      resolvedPrompt: prompt.text,
      model,
    };
  }

  async send(conversationId: string, message: string, outputSchema?: ZodType): Promise<ConversationResponse> {
    const state = await this.getOrReconstructState(conversationId);
    const options: GenerateOptions = outputSchema
      ? { ...state.baseOptions, outputSchema }
      : state.baseOptions;
    try {
      const response = await this.mastraAgent.generate(message, options);
      return { text: response.text, object: response.object };
    } catch (error) {
      if (isMastraAdapterError(error)) {
        throw new ConversationSendError(conversationId, error);
      }
      throw error;
    }
  }

  async *stream(conversationId: string, message: string, outputSchema?: ZodType): AsyncIterable<StreamChunk> {
    const state = await this.getOrReconstructState(conversationId);
    const options: GenerateOptions = outputSchema
      ? { ...state.baseOptions, outputSchema }
      : state.baseOptions;
    try {
      yield* this.mastraAgent.stream(message, options);
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

    const state: ConversationState = {
      sessionId: session.id,
      mastraThreadId: session.mastraThreadId,
      promptSlug: session.promptSlug,
      resolvedPrompt: session.resolvedPrompt,
      model: this.config.defaultModel,
      userId: session.userId,
      baseOptions: { threadId: session.mastraThreadId, resourceId: session.userId },
    };
    this.conversations.set(session.id, state);
    return state;
  }
}
