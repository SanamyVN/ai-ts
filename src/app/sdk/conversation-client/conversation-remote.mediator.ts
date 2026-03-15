import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { IConversationMediator } from '@/business/domain/conversation/client/mediator.js';
import type {
  ConversationClient,
  ConversationResponseClient,
} from '@/business/domain/conversation/client/schemas.js';
import {
  conversationClientSchema,
  conversationResponseClientSchema,
} from '@/business/domain/conversation/client/schemas.js';
import type {
  CreateConversationCommand,
  SendMessageCommand,
} from '@/business/domain/conversation/client/queries.js';
import { ConversationNotFoundClientError } from '@/business/domain/conversation/client/errors.js';

/** HTTP client interface for making requests to the conversation service. */
export interface HttpClient {
  get(
    url: string,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  post(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
}

/** Internal token for the HTTP client used by the remote conversation mediator. */
export const AI_CONVERSATION_HTTP_CLIENT = createToken<HttpClient>('AI_CONVERSATION_HTTP_CLIENT');

/** Internal token for the remote conversation service config. */
export const AI_CONVERSATION_REMOTE_CONFIG = createToken<{ baseUrl: string }>(
  'AI_CONVERSATION_REMOTE_CONFIG',
);

/**
 * Microservice adapter — makes HTTP calls to the conversation service.
 *
 * Used when the conversation engine runs as a separate deployment.
 */
@Injectable()
export class ConversationRemoteMediator implements IConversationMediator {
  constructor(
    @Inject(AI_CONVERSATION_HTTP_CLIENT) private readonly http: HttpClient,
    @Inject(AI_CONVERSATION_REMOTE_CONFIG) private readonly config: { baseUrl: string },
  ) {}

  async create(
    command: InstanceType<typeof CreateConversationCommand>,
  ): Promise<ConversationClient> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/conversations`, {
      promptSlug: command.promptSlug,
      promptParams: command.promptParams,
      userId: command.userId,
      tenantId: command.tenantId,
      purpose: command.purpose,
      model: command.model,
    });
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }
    return conversationClientSchema.parse(response.body?.data);
  }

  async sendMessage(
    command: InstanceType<typeof SendMessageCommand>,
  ): Promise<ConversationResponseClient> {
    const response = await this.http.post(
      `${this.config.baseUrl}/ai/conversations/${command.conversationId}/messages`,
      { message: command.message },
    );
    if (!response.ok) {
      if (response.status === 404) {
        throw new ConversationNotFoundClientError(command.conversationId);
      }
      throw new Error(`Failed to send message: ${response.status}`);
    }
    return conversationResponseClientSchema.parse(response.body?.data);
  }
}
