import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { ISessionMediator } from '@/business/domain/session/client/mediator.js';
import type {
  SessionClientModel,
  SessionSummaryClient,
  MessageListClient,
} from '@/business/domain/session/client/schemas.js';
import {
  sessionClientModelSchema,
  sessionSummaryClientSchema,
  messageListClientSchema,
} from '@/business/domain/session/client/schemas.js';
import type {
  FindSessionByIdQuery,
  ListSessionsQuery,
  CreateSessionCommand,
  EndSessionCommand,
  UpdateSessionCommand,
  UpdateSessionLastMessageCommand,
  GetSessionMessagesQuery,
} from '@/business/domain/session/client/queries.js';
import { SessionNotFoundClientError } from '@/business/domain/session/client/errors.js';
import { z } from 'zod';

/** HTTP client interface for making requests to the session service. */
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
  patch(
    url: string,
    body: unknown,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
  delete(
    url: string,
    options?: { responseSchema?: unknown },
  ): Promise<{ ok: boolean; status?: number; body?: { data?: unknown } }>;
}

/** Internal token for the HTTP client used by the remote session mediator. */
export const AI_SESSION_HTTP_CLIENT = createToken<HttpClient>('AI_SESSION_HTTP_CLIENT');

/** Internal token for the remote session service config. */
export const AI_SESSION_REMOTE_CONFIG = createToken<{ baseUrl: string }>(
  'AI_SESSION_REMOTE_CONFIG',
);

/**
 * Microservice adapter — makes HTTP calls to the session service.
 *
 * Used when the session service runs as a separate deployment.
 */
@Injectable()
export class SessionRemoteMediator implements ISessionMediator {
  constructor(
    @Inject(AI_SESSION_HTTP_CLIENT) private readonly http: HttpClient,
    @Inject(AI_SESSION_REMOTE_CONFIG) private readonly config: { baseUrl: string },
  ) {}

  async findById(query: InstanceType<typeof FindSessionByIdQuery>): Promise<SessionClientModel> {
    const response = await this.http.get(`${this.config.baseUrl}/ai/sessions/${query.sessionId}`);
    if (!response.ok) {
      if (response.status === 404) throw new SessionNotFoundClientError(query.sessionId);
      throw new Error(`Failed to fetch session: ${response.status}`);
    }
    return sessionClientModelSchema.parse(response.body?.data);
  }

  async list(query: InstanceType<typeof ListSessionsQuery>): Promise<SessionSummaryClient[]> {
    const params = new URLSearchParams();
    if (query.userId) params.set('userId', query.userId);
    if (query.tenantId) params.set('tenantId', query.tenantId);
    if (query.purpose) params.set('purpose', query.purpose);
    if (query.status) params.set('status', query.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.http.get(`${this.config.baseUrl}/ai/sessions${qs}`);
    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.status}`);
    }
    return z.array(sessionSummaryClientSchema).parse(response.body?.data ?? []);
  }

  async create(command: InstanceType<typeof CreateSessionCommand>): Promise<SessionClientModel> {
    const response = await this.http.post(`${this.config.baseUrl}/ai/sessions`, {
      userId: command.userId,
      tenantId: command.tenantId,
      promptSlug: command.promptSlug,
      purpose: command.purpose,
      metadata: command.metadata,
    });
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }
    return sessionClientModelSchema.parse(response.body?.data);
  }

  async end(command: InstanceType<typeof EndSessionCommand>): Promise<void> {
    const response = await this.http.delete(
      `${this.config.baseUrl}/ai/sessions/${command.sessionId}`,
    );
    if (!response.ok) {
      if (response.status === 404) throw new SessionNotFoundClientError(command.sessionId);
      throw new Error(`Failed to end session: ${response.status}`);
    }
  }

  async update(command: InstanceType<typeof UpdateSessionCommand>): Promise<void> {
    const response = await this.http.patch(
      `${this.config.baseUrl}/ai/sessions/${command.sessionId}`,
      { resolvedPrompt: command.resolvedPrompt },
    );
    if (!response.ok) {
      if (response.status === 404) throw new SessionNotFoundClientError(command.sessionId);
      throw new Error(`Failed to update session: ${response.status}`);
    }
  }

  async updateLastMessage(
    command: InstanceType<typeof UpdateSessionLastMessageCommand>,
  ): Promise<void> {
    const response = await this.http.patch(
      `${this.config.baseUrl}/ai/sessions/${command.sessionId}/last-message`,
      { lastMessage: command.lastMessage },
    );
    if (!response.ok) {
      if (response.status === 404) throw new SessionNotFoundClientError(command.sessionId);
      throw new Error(`Failed to update session last message: ${response.status}`);
    }
  }

  async getMessages(
    query: InstanceType<typeof GetSessionMessagesQuery>,
  ): Promise<MessageListClient> {
    const params = new URLSearchParams();
    params.set('page', String(query.page));
    params.set('perPage', String(query.perPage));
    const response = await this.http.get(
      `${this.config.baseUrl}/ai/sessions/${query.sessionId}/messages?${params.toString()}`,
    );
    if (!response.ok) {
      if (response.status === 404) throw new SessionNotFoundClientError(query.sessionId);
      throw new Error(`Failed to fetch session messages: ${response.status}`);
    }
    return messageListClientSchema.parse(response.body?.data);
  }
}
