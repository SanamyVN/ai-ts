import { z } from 'zod';
import { createQuery, createCommand } from '@sanamyvn/foundation/mediator/request';
import {
  sessionClientModelSchema,
  sessionSummaryClientSchema,
  messageListClientSchema,
} from './schemas.js';

export const FindSessionByIdQuery = createQuery({
  type: 'ai.session.findById',
  payload: z.object({ sessionId: z.string() }),
  response: sessionClientModelSchema,
});

export const ListSessionsQuery = createQuery({
  type: 'ai.session.list',
  payload: z
    .object({
      userId: z.string().optional(),
      userIds: z.array(z.string()).optional(),
      purpose: z.string().optional(),
      /**
       * Case-sensitive prefix match against the session purpose.
       * Cannot be an empty string. Mutually exclusive with `purpose`. (§3)
       */
      purposePrefix: z.string().min(1).optional(),
      status: z.string().optional(),
      search: z.string().max(200).optional(),
      /**
       * Half-open lower bound for session start time `[startedAtGte, startedAtLt)`.
       * Filters on session start time — not message send time. For billing, use
       * `CountMessagesQuery` which scopes on `sentAt`. (§2)
       */
      startedAtGte: z.date().optional(),
      /** Half-open upper bound for session start time. Must be strictly greater than `startedAtGte`. (§2) */
      startedAtLt: z.date().optional(),
      /** Required. 1-based page number. (§5) */
      page: z.number().int().min(1),
      /** Required. Capped at 500. Last page detected via `items.length < perPage`. (§5) */
      perPage: z.number().int().min(1).max(500),
    })
    .refine((v) => !(v.purpose && v.purposePrefix), {
      message: 'purpose and purposePrefix are mutually exclusive',
    })
    .refine((v) => !v.startedAtGte || !v.startedAtLt || v.startedAtLt > v.startedAtGte, {
      message: 'startedAtLt must be strictly greater than startedAtGte',
    }),
  response: z.object({
    items: z.array(sessionSummaryClientSchema),
    page: z.number(),
    perPage: z.number(),
  }),
});

export const CreateSessionCommand = createCommand({
  type: 'ai.session.create',
  payload: z.object({
    userId: z.string(),
    promptSlug: z.string(),
    resolvedPrompt: z.string(),
    purpose: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  response: sessionClientModelSchema,
});

export const EndSessionCommand = createCommand({
  type: 'ai.session.end',
  payload: z.object({ sessionId: z.string() }),
  response: z.void(),
});

export const UpdateSessionCommand = createCommand({
  type: 'ai.session.update',
  payload: z.object({
    sessionId: z.string(),
    resolvedPrompt: z.string(),
  }),
  response: z.void(),
});

export const UpdateSessionTitleCommand = createCommand({
  type: 'ai.session.updateTitle',
  payload: z.object({
    sessionId: z.string(),
    title: z.string().min(1).max(100),
  }),
  response: z.void(),
});

export const UpdateSessionLastMessageCommand = createCommand({
  type: 'ai.session.updateLastMessage',
  payload: z.object({
    sessionId: z.string(),
    lastMessage: z.string(),
  }),
  response: z.void(),
});

export const DeleteSessionCommand = createCommand({
  type: 'ai.session.delete',
  payload: z.object({ sessionId: z.string() }),
  response: z.void(),
});

/**
 * Retrieves a paginated page of messages for a session.
 *
 * **Response shape:** `{ items, page, perPage, total }`.
 * - `items`: messages in this page, ordered by `createdAt ASC`.
 * - `total`: count of messages in this thread across all pages.
 *   This is the literal stored Mastra transcript count (all roles).
 *   It is **not** the same as `SessionSummary.messageCount`, which counts
 *   only successful user submissions from the local ledger and is used
 *   for billing. (§2 of the paginated-total-counts design doc)
 * - Page indexing is 1-based: `page: 1` returns the first slice of the thread.
 */
export const GetSessionMessagesQuery = createQuery({
  type: 'ai.session.getMessages',
  payload: z.object({
    sessionId: z.string(),
    /** 1-based page number. Must be >= 1. (§5) */
    page: z.number().int().min(1),
    /** Items per page. Must be 1–500. (§5) */
    perPage: z.number().int().min(1).max(500),
  }),
  response: messageListClientSchema,
});

/**
 * Appends one row to the `ai_session_messages` event ledger.
 *
 * Invoked only by `conversation.business` after a successful generate or
 * stream call. Not for general consumer use — the SDK exposes the type
 * for handler registration on the local mediator only. (§1, §6.7)
 *
 * `eventId` is caller-supplied (UUID v4) so that HTTP retries that replay
 * the same request body hit the repository's `ON CONFLICT (id) DO NOTHING`
 * guard rather than inserting a duplicate ledger row. (§idempotency)
 */
export const AppendSessionMessageEventCommand = createCommand({
  type: 'ai.session.appendMessageEvent',
  payload: z.object({
    /** Stable UUID v4 generated at the call site before the HTTP hop. Used for idempotency. */
    eventId: z.uuid(),
    sessionId: z.string(),
    sentAt: z.date(),
  }),
  response: z.void(),
});

/**
 * Billing aggregate over the `ai_session_messages` ledger.
 *
 * Scoping is implicit: the active Postgres `search_path` on the `AI_DB`
 * connection determines which tenant schema is queried. The host app must
 * set `SET LOCAL search_path = <tenant_schema>, public` before invoking
 * this query. See the README Multi-tenancy section.
 *
 * - Counts every message whose `sent_at` falls in the half-open interval
 *   `[sentAtGte, sentAtLt)`, regardless of session status.
 * - `purpose` and `purposePrefix` are mutually exclusive; `purposePrefix`
 *   is case-sensitive and cannot be empty.
 * - Response is `{ count }` so future breakdown fields can be added
 *   additively. (§4)
 */
export const CountMessagesQuery = createQuery({
  type: 'ai.session.countMessages',
  payload: z
    .object({
      purpose: z.string().optional(),
      /**
       * Case-sensitive prefix match on purpose. Cannot be empty string.
       * Mutually exclusive with `purpose`. (§3, §4)
       */
      purposePrefix: z.string().min(1).optional(),
      /**
       * Half-open lower bound: count events where `sent_at >= sentAtGte`.
       * Combine with `sentAtLt` for a billing period `[Gte, Lt)`. (§4)
       */
      sentAtGte: z.date().optional(),
      /**
       * Half-open upper bound: exclude events where `sent_at >= sentAtLt`.
       * Must be strictly greater than `sentAtGte` when both are provided. (§4)
       */
      sentAtLt: z.date().optional(),
    })
    .refine((v) => !(v.purpose && v.purposePrefix), {
      message: 'purpose and purposePrefix are mutually exclusive',
    })
    .refine((v) => !v.sentAtGte || !v.sentAtLt || v.sentAtLt > v.sentAtGte, {
      message: 'sentAtLt must be strictly greater than sentAtGte',
    }),
  response: z.object({ count: z.number().int().nonnegative() }),
});
