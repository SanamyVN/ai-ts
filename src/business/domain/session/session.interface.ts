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
   * Lists sessions matching the given filter criteria, newest first.
   * Pagination is required — there are no defaults (§5).
   *
   * @param filter - Criteria to narrow results. Supports `purposePrefix`,
   *   `startedAtGte`, and `startedAtLt` in addition to existing fields.
   * @param pagination - 1-based page number and page size (max 500 per page).
   * @returns Array of session summaries for the requested page, each with
   *   `messageCount` projected from the `ai_session_messages` ledger. (§1, §5)
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
   * Appends one event row to the `ai_session_messages` ledger for the given
   * session. Loads the session to read `tenantId` and `purpose` for
   * denormalization. Returns silently when `session.tenantId` is null —
   * tenantless sessions are not billable and must not pollute aggregates.
   * Throws `SessionNotFoundError` when the session does not exist.
   *
   * `sentAt` is captured at hook entry in Phase 4 and threaded through the
   * mediator command payload so the recorded timestamp reflects when the user
   * sent the message, not when the DB write completes (§1 "Service surface",
   * §1 "When sent_at is captured").
   *
   * Intended to be called best-effort from `conversation.business` after a
   * successful LLM call — not for general consumer use. (§1)
   *
   * @param sessionId - Session to record the event against.
   * @param sentAt - Timestamp captured at hook entry (before the LLM call).
   * @throws {SessionNotFoundError} If the session does not exist.
   */
  appendMessageEvent(sessionId: string, sentAt: Date): Promise<void>;

  /**
   * Returns the total count of user-submitted messages across all sessions
   * matching `filter`. Delegates to `sessionMessageRepository.count` — which
   * filters on **message send time** (`sentAt`), not session start time.
   *
   * Returns a bare `number`; the mediator wraps it as `{ count }` for the wire
   * format in Phase 3 (§4).
   *
   * @param filter - `tenantId` is required. All other fields are optional.
   * @returns Non-negative integer.
   */
  countMessagesByTenant(filter: CountMessagesFilter): Promise<number>;
}

/** Dependency-injection token for {@link ISessionService}. */
export const SESSION_SERVICE = createToken<ISessionService>('SESSION_SERVICE');
