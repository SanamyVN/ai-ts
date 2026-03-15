import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { pg } from '../fixture.js';
import { createAiTestContext, type AiTestContext } from '../helpers.js';
import {
  PromptNotFoundError,
  PromptAlreadyExistsError,
} from '@/business/domain/prompt/prompt.error.js';

describe('Prompt / CRUD', () => {
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

  it('creates a prompt and retrieves it by slug', async () => {
    const created = await ctx.promptService.create({
      name: 'Test Prompt',
      slug: 'test-prompt',
      parameterSchema: { name: { type: 'string' } },
      metadata: { category: 'test' },
    });

    expect(created.id).toBeDefined();
    expect(created.slug).toBe('test-prompt');

    const found = await ctx.promptService.getBySlug('test-prompt');
    expect(found.id).toBe(created.id);
    expect(found.name).toBe('Test Prompt');
    expect(found.parameterSchema).toEqual({ name: { type: 'string' } });
    expect(found.metadata).toEqual({ category: 'test' });
  });

  it('creates a prompt then updates its metadata', async () => {
    const created = await ctx.promptService.create({
      name: 'Original Name',
      slug: 'update-me',
      metadata: { env: 'staging' },
    });

    const updated = await ctx.promptService.update(created.id, {
      name: 'Updated Name',
      metadata: { env: 'production' },
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Updated Name');
    expect(updated.metadata).toEqual({ env: 'production' });
  });

  it('creates a prompt and finds it in the list', async () => {
    await ctx.promptService.create({
      name: 'Listed Prompt',
      slug: 'listed-prompt',
    });

    const results = await ctx.promptService.list();

    expect(results.length).toBeGreaterThanOrEqual(1);
    const found = results.find((p) => p.slug === 'listed-prompt');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Listed Prompt');
  });

  it('finds a prompt when its name matches the search filter', async () => {
    await ctx.promptService.create({
      name: 'Searchable Greeting',
      slug: 'searchable-greeting',
    });
    await ctx.promptService.create({
      name: 'Other Prompt',
      slug: 'other-prompt',
    });

    const results = await ctx.promptService.list({ search: 'Greeting' });

    expect(results.length).toBeGreaterThanOrEqual(1);
    const found = results.find((p) => p.slug === 'searchable-greeting');
    expect(found).toBeDefined();
    const notFound = results.find((p) => p.slug === 'other-prompt');
    expect(notFound).toBeUndefined();
  });

  it('throws PromptAlreadyExistsError when creating a duplicate slug', async () => {
    await ctx.promptService.create({ name: 'First', slug: 'duplicate-slug' });

    await expect(
      ctx.promptService.create({ name: 'Second', slug: 'duplicate-slug' }),
    ).rejects.toThrow(PromptAlreadyExistsError);
  });

  it('throws PromptNotFoundError when getting a non-existent slug', async () => {
    await expect(ctx.promptService.getBySlug('does-not-exist')).rejects.toThrow(
      PromptNotFoundError,
    );
  });
});
