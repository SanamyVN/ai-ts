import { describe, expect, it } from 'vitest';
import {
  AppendSessionMessageEventCommand,
  CountMessagesQuery,
  ListSessionsQuery,
  GetSessionMessagesQuery,
} from './queries.js';

/**
 * Assert that a constructor call throws a SchemaValidationError whose Zod cause
 * includes at least one issue with the given message string.
 *
 * `createQuery`/`createCommand` wrap ZodError in SchemaValidationError with
 * message `'Schema validation failed'`. The refinement messages live in
 * `error.cause.issues[].message`.
 */
function expectRefineMessage(fn: () => unknown, refinementMessage: string): void {
  let caughtError: unknown;
  try {
    fn();
  } catch (e) {
    caughtError = e;
  }
  expect(caughtError).toBeDefined();
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const err = caughtError as { cause?: { issues?: { message: string }[] } };
  const messages = err.cause?.issues?.map((i) => i.message) ?? [];
  expect(messages).toContain(refinementMessage);
}

// ─── AppendSessionMessageEventCommand ────────────────────────────────────────

describe('AppendSessionMessageEventCommand', () => {
  it('constructs successfully with eventId, sessionId and sentAt', () => {
    expect(
      () =>
        new AppendSessionMessageEventCommand({
          eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
          sessionId: 'session-1',
          sentAt: new Date(),
        }),
    ).not.toThrow();
  });

  it('rejects missing sessionId', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect(() => new AppendSessionMessageEventCommand({ sentAt: new Date() } as never)).toThrow();
  });

  it('rejects missing sentAt', () => {
    expect(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      () => new AppendSessionMessageEventCommand({ sessionId: 'session-1' } as never),
    ).toThrow();
  });

  it('rejects non-Date sentAt', () => {
    expect(
      () =>
        new AppendSessionMessageEventCommand({
          eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
          sessionId: 'session-1',
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          sentAt: '2026-04-01T00:00:00Z' as unknown as Date,
        }),
    ).toThrow();
  });
});

// ─── CountMessagesQuery ───────────────────────────────────────────────────────

describe('CountMessagesQuery', () => {
  it('dispatch type is ai.session.countMessages', () => {
    const q = new CountMessagesQuery({});
    expect(q.type).toBe('ai.session.countMessages');
  });

  it('constructs with an empty payload', () => {
    expect(() => new CountMessagesQuery({})).not.toThrow();
  });

  it('rejects empty-string purposePrefix', () => {
    expect(() => new CountMessagesQuery({ purposePrefix: '' })).toThrow();
  });

  it('rejects purpose and purposePrefix together', () => {
    expectRefineMessage(
      () => new CountMessagesQuery({ purpose: 'ta-chat', purposePrefix: 'ta-' }),
      'purpose and purposePrefix are mutually exclusive',
    );
  });

  it('accepts purpose without purposePrefix', () => {
    expect(() => new CountMessagesQuery({ purpose: 'ta-chat' })).not.toThrow();
  });

  it('accepts purposePrefix without purpose', () => {
    expect(() => new CountMessagesQuery({ purposePrefix: 'ta-' })).not.toThrow();
  });

  it('rejects sentAtLt equal to sentAtGte', () => {
    const d = new Date('2026-04-01T00:00:00Z');
    expectRefineMessage(
      () => new CountMessagesQuery({ sentAtGte: d, sentAtLt: d }),
      'sentAtLt must be strictly greater than sentAtGte',
    );
  });

  it('rejects sentAtLt less than sentAtGte', () => {
    expectRefineMessage(
      () =>
        new CountMessagesQuery({
          sentAtGte: new Date('2026-04-02T00:00:00Z'),
          sentAtLt: new Date('2026-04-01T00:00:00Z'),
        }),
      'sentAtLt must be strictly greater than sentAtGte',
    );
  });

  it('accepts sentAtLt strictly greater than sentAtGte', () => {
    expect(
      () =>
        new CountMessagesQuery({
          sentAtGte: new Date('2026-04-01T00:00:00Z'),
          sentAtLt: new Date('2026-05-01T00:00:00Z'),
        }),
    ).not.toThrow();
  });

  it('accepts sentAtGte only (no sentAtLt)', () => {
    expect(
      () => new CountMessagesQuery({ sentAtGte: new Date('2026-04-01T00:00:00Z') }),
    ).not.toThrow();
  });
});

// ─── ListSessionsQuery ────────────────────────────────────────────────────────

describe('ListSessionsQuery', () => {
  it('constructs with required page and perPage', () => {
    expect(() => new ListSessionsQuery({ page: 1, perPage: 20 })).not.toThrow();
  });

  it('rejects page < 1', () => {
    expect(() => new ListSessionsQuery({ page: 0, perPage: 20 })).toThrow();
  });

  it('rejects perPage > 500', () => {
    expect(() => new ListSessionsQuery({ page: 1, perPage: 501 })).toThrow();
  });

  it('rejects perPage < 1', () => {
    expect(() => new ListSessionsQuery({ page: 1, perPage: 0 })).toThrow();
  });

  it('rejects missing page', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect(() => new ListSessionsQuery({ perPage: 20 } as never)).toThrow();
  });

  it('rejects missing perPage', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect(() => new ListSessionsQuery({ page: 1 } as never)).toThrow();
  });

  it('rejects empty-string purposePrefix', () => {
    expect(() => new ListSessionsQuery({ page: 1, perPage: 20, purposePrefix: '' })).toThrow();
  });

  it('rejects purpose and purposePrefix together', () => {
    expectRefineMessage(
      () =>
        new ListSessionsQuery({ page: 1, perPage: 20, purpose: 'ta-chat', purposePrefix: 'ta-' }),
      'purpose and purposePrefix are mutually exclusive',
    );
  });

  it('rejects startedAtLt equal to startedAtGte', () => {
    const d = new Date('2026-04-01T00:00:00Z');
    expectRefineMessage(
      () => new ListSessionsQuery({ page: 1, perPage: 20, startedAtGte: d, startedAtLt: d }),
      'startedAtLt must be strictly greater than startedAtGte',
    );
  });

  it('rejects startedAtLt less than startedAtGte', () => {
    expectRefineMessage(
      () =>
        new ListSessionsQuery({
          page: 1,
          perPage: 20,
          startedAtGte: new Date('2026-04-02T00:00:00Z'),
          startedAtLt: new Date('2026-04-01T00:00:00Z'),
        }),
      'startedAtLt must be strictly greater than startedAtGte',
    );
  });

  it('accepts startedAtLt strictly greater than startedAtGte', () => {
    expect(
      () =>
        new ListSessionsQuery({
          page: 1,
          perPage: 20,
          startedAtGte: new Date('2026-04-01T00:00:00Z'),
          startedAtLt: new Date('2026-05-01T00:00:00Z'),
        }),
    ).not.toThrow();
  });

  it('accepts all optional filters together with no mutual-exclusion conflicts', () => {
    expect(
      () =>
        new ListSessionsQuery({
          page: 1,
          perPage: 50,
          purposePrefix: 'ta-',
          startedAtGte: new Date('2026-04-01T00:00:00Z'),
          startedAtLt: new Date('2026-05-01T00:00:00Z'),
        }),
    ).not.toThrow();
  });
});

// ─── GetSessionMessagesQuery ──────────────────────────────────────────────────

describe('GetSessionMessagesQuery', () => {
  it('constructs with valid page and perPage', () => {
    expect(
      () => new GetSessionMessagesQuery({ sessionId: 'session-1', page: 1, perPage: 20 }),
    ).not.toThrow();
  });

  it('rejects page < 1', () => {
    expect(
      () => new GetSessionMessagesQuery({ sessionId: 'session-1', page: 0, perPage: 20 }),
    ).toThrow();
  });

  it('rejects perPage > 500', () => {
    expect(
      () => new GetSessionMessagesQuery({ sessionId: 'session-1', page: 1, perPage: 501 }),
    ).toThrow();
  });

  it('rejects perPage < 1', () => {
    expect(
      () => new GetSessionMessagesQuery({ sessionId: 'session-1', page: 1, perPage: 0 }),
    ).toThrow();
  });
});
