import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  Session,
  SessionSummary,
  StartSessionInput,
  SessionFilter,
  CountMessagesFilter,
  Transcript,
} from './session.model.js';
import type { MessageList, Pagination } from '@/business/sdk/mastra/mastra.interface.js';

/** Manages the lifecycle of AI sessions from start to export. */
export interface ISessionService {
  /**
   * Starts a new session with a resolved prompt.
   * @param input - Session configuration including user, prompt, and purpose.
   * @returns The created session.
   */
  start(input: StartSessionInput): Promise<Session>;

  /**
   * Pauses an active session.
   * @param sessionId - Session to pause.
   * @throws {SessionNotFoundError} If the session does not exist.
   * @throws {SessionAlreadyEndedError} If the session has already ended.
   */
  pause(sessionId: string): Promise<void>;

  /**
   * Resumes a paused session.
   * @param sessionId - Session to resume.
   * @returns The resumed session.
   * @throws {SessionNotFoundError} If the session does not exist.
   * @throws {SessionAlreadyEndedError} If the session has already ended.
   */
  resume(sessionId: string): Promise<Session>;

  /**
   * Permanently ends a session.
   * @param sessionId - Session to end.
   * @throws {SessionNotFoundError} If the session does not exist.
   * @throws {SessionAlreadyEndedError} If the session has already ended.
   */
  end(sessionId: string): Promise<void>;

  /**
   * Retrieves a session by ID.
   * @param sessionId - Session to retrieve.
   * @returns The full session record.
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  get(sessionId: string): Promise<Session>;

  /**
   * Lists sessions matching `filter`, paginated.
   *
   * @param pagination - 1-based `page`; `perPage` is required and capped
   *   at 500 by the mediator. Last page is detected via
   *   `result.length < perPage`. (§5)
   */
  list(
    filter: SessionFilter,
    pagination: { page: number; perPage: number },
  ): Promise<SessionSummary[]>;

  /**
   * Retrieves paginated messages for a session.
   * @param sessionId - Session whose messages to fetch.
   * @param pagination - Page size and cursor options.
   * @returns A paginated list of messages.
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  getMessages(sessionId: string, pagination: Pagination): Promise<MessageList>;

  /**
   * Exports the full session transcript in the requested format.
   * @param sessionId - Session to export.
   * @param format - Output format: `'json'` or `'text'`.
   * @returns The transcript content and associated messages.
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  exportTranscript(sessionId: string, format: 'json' | 'text'): Promise<Transcript>;

  /**
   * Updates the resolved prompt for a session.
   * @param sessionId - Session to update.
   * @param resolvedPrompt - The new resolved prompt text.
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  updateResolvedPrompt(sessionId: string, resolvedPrompt: string): Promise<void>;

  /**
   * Updates the last message and its timestamp for a session.
   * @param sessionId - Session to update.
   * @param lastMessage - The most recent message text.
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  updateLastMessage(sessionId: string, lastMessage: string): Promise<void>;

  /**
   * Updates the title of a session.
   * @param sessionId - Session to update.
   * @param title - The new title text.
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  updateTitle(sessionId: string, title: string): Promise<void>;

  /**
   * Permanently deletes a session and its backing Mastra thread.
   * @param sessionId - Session to delete.
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Appends one row to the `ai_session_messages` event ledger for the
   * given session. Invoked only by `conversation.business` after a
   * successful `generate`/`stream` call. Not for general consumer use.
   *
   * @param sessionId - Session to record the event against.
   * @param sentAt - Timestamp captured at hook entry (before the LLM call).
   * @throws {SessionNotFoundError} when no session exists with the given id.
   */
  appendMessageEvent(sessionId: string, sentAt: Date): Promise<void>;

  /**
   * Billing aggregate — `COUNT(*)` over the `ai_session_messages` ledger
   * filtered by `tenantId`, optional `purpose`/`purposePrefix`, and the
   * half-open interval `[sentAtGte, sentAtLt)` on message `sent_at`.
   * Counts across all session statuses.
   *
   * @returns the bare count; the wire format `{ count }` wrapping happens
   * in the local mediator. (§4)
   */
  countMessagesByTenant(filter: CountMessagesFilter): Promise<number>;
}

/** Dependency-injection token for {@link ISessionService}. */
export const SESSION_SERVICE = createToken<ISessionService>('SESSION_SERVICE');
