import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { pg } from '../fixture.js';
import { createAiTestContext, type AiTestContext } from '../helpers.js';
import {
  PromptNotFoundError,
  InvalidPromptParametersError,
} from '@/business/domain/prompt/prompt.error.js';

describe('Prompt / Versioning', () => {
  let ctx: AiTestContext;

  beforeAll(async () => {
    await pg.start();
  });

  afterAll(async () => {
    await pg.stop();
  });

  beforeEach(() => {
    ctx = createAiTestContext();
  });

  afterEach(async () => {
    await pg.truncateAll();
  });

  it('creates a prompt version and verifies version number is 1', async () => {
    const prompt = await ctx.promptService.create({ name: 'First Version', slug: 'first-version' });

    const version = await ctx.promptService.createVersion(prompt.id, {
      template: 'Hello world',
    });

    expect(version.version).toBe(1);
    expect(version.promptId).toBe(prompt.id);
    expect(version.template).toBe('Hello world');
  });

  it('creates a version with activate and resolves the rendered template', async () => {
    const prompt = await ctx.promptService.create({
      name: 'Greeting Prompt',
      slug: 'greeting-prompt',
    });

    await ctx.promptService.createVersion(prompt.id, {
      template: 'Hello {{name}}!',
      activate: true,
    });

    const resolved = await ctx.promptService.resolve('greeting-prompt', { name: 'Alice' });

    expect(resolved.slug).toBe('greeting-prompt');
    expect(resolved.version).toBe(1);
    expect(resolved.text).toBe('Hello Alice!');
  });

  it('creates 2 versions, activates the second, and verifies the second is active', async () => {
    const prompt = await ctx.promptService.create({ name: 'Two Versions', slug: 'two-versions' });

    await ctx.promptService.createVersion(prompt.id, {
      template: 'Version one template',
      activate: true,
    });
    const v2 = await ctx.promptService.createVersion(prompt.id, {
      template: 'Version two template',
      activate: true,
    });

    expect(v2.version).toBe(2);

    const resolved = await ctx.promptService.resolve('two-versions', {});
    expect(resolved.version).toBe(2);
    expect(resolved.text).toBe('Version two template');
  });

  it('throws PromptNotFoundError when resolving a non-existent slug', async () => {
    await expect(ctx.promptService.resolve('no-such-prompt', {})).rejects.toThrow(
      PromptNotFoundError,
    );
  });

  it('throws PromptNotFoundError when resolving a prompt with no active version', async () => {
    const prompt = await ctx.promptService.create({
      name: 'No Active Version',
      slug: 'no-active-version',
    });

    // Create a version but do not activate it
    await ctx.promptService.createVersion(prompt.id, { template: 'Draft template' });

    await expect(ctx.promptService.resolve('no-active-version', {})).rejects.toThrow(
      PromptNotFoundError,
    );
  });

  it('renders Mustache parameters correctly', async () => {
    const prompt = await ctx.promptService.create({
      name: 'Mustache Prompt',
      slug: 'mustache-prompt',
    });

    await ctx.promptService.createVersion(prompt.id, {
      template: 'Dear {{title}} {{lastName}}, your order {{orderId}} is ready.',
      activate: true,
    });

    const resolved = await ctx.promptService.resolve('mustache-prompt', {
      title: 'Dr.',
      lastName: 'Smith',
      orderId: 'ORD-999',
    });

    expect(resolved.text).toBe('Dear Dr. Smith, your order ORD-999 is ready.');
  });

  it('throws InvalidPromptParametersError when required parameters are missing', async () => {
    const prompt = await ctx.promptService.create({
      name: 'Strict Prompt',
      slug: 'strict-prompt',
      parameterSchema: {
        userId: { type: 'string' },
        count: { type: 'number' },
      },
    });

    await ctx.promptService.createVersion(prompt.id, {
      template: 'User {{userId}} has {{count}} items.',
      activate: true,
    });

    await expect(ctx.promptService.resolve('strict-prompt', { userId: 'u-1' })).rejects.toThrow(
      InvalidPromptParametersError,
    );
  });
});
