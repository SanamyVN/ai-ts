import { describe, expect, it } from 'vitest';
import { CreateConversationCommand } from './queries.js';

describe('CreateConversationCommand', () => {
  it('constructs successfully without tenantId', () => {
    expect(
      () =>
        new CreateConversationCommand({
          promptSlug: 'test-prompt',
          promptParams: {},
          userId: 'user-1',
          purpose: 'ta-chat',
        }),
    ).not.toThrow();
  });

  it('silently strips tenantId when provided (non-strict schema)', () => {
    // Zod strips unknown fields on parse — tenantId is no longer a declared
    // field, so it is dropped rather than rejected. (Decision 3)
    const cmd = new CreateConversationCommand({
      promptSlug: 'test-prompt',
      promptParams: {},
      userId: 'user-1',
      purpose: 'ta-chat',
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      ...({ tenantId: 'tenant-1' } as Record<string, unknown>),
    });
    // Foundation's createCommand spreads payload fields directly onto the
    // command instance via Object.assign(this, parsed) — there is no
    // `.payload` property. A stripped field is therefore absent on `cmd`
    // itself, not on `cmd.payload`. (See node_modules/@sanamyvn/foundation/
    // dist/mediator/request.js — createCommand body.)
    expect(cmd).not.toHaveProperty('tenantId');
  });

  it('dispatch type is ai.conversation.create', () => {
    const cmd = new CreateConversationCommand({
      promptSlug: 'p',
      promptParams: {},
      userId: 'u',
      purpose: 'q',
    });
    expect(cmd.type).toBe('ai.conversation.create');
  });
});
