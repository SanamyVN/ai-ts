import { describe, expect, it, beforeEach } from 'vitest';
import { PromptService } from './prompt.business.js';
import { createMockPromptRepository } from '@/repository/domain/prompt/prompt.testing.js';
import { createMockPromptVersionRepository } from '@/repository/domain/prompt-version/prompt-version.testing.js';
import { PromptNotFoundError } from './prompt.error.js';
import { DuplicatePromptError } from '@/repository/domain/prompt/prompt.error.js';
import { PromptAlreadyExistsError } from './prompt.error.js';

describe('PromptService', () => {
  let service: PromptService;
  let promptRepo: ReturnType<typeof createMockPromptRepository>;
  let versionRepo: ReturnType<typeof createMockPromptVersionRepository>;

  beforeEach(() => {
    promptRepo = createMockPromptRepository();
    versionRepo = createMockPromptVersionRepository();
    service = new PromptService(promptRepo, versionRepo);
  });

  describe('getBySlug', () => {
    it('returns prompt with active version', async () => {
      const record = {
        id: '1',
        name: 'Test',
        slug: 'test',
        parameterSchema: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const version = {
        id: 'v1',
        promptId: '1',
        version: 1,
        template: 'Hello {{name}}',
        isActive: true,
        createdAt: new Date(),
      };
      promptRepo.findBySlug.mockResolvedValue(record);
      versionRepo.findActiveByPromptId.mockResolvedValue(version);

      const result = await service.getBySlug('test');
      expect(result.slug).toBe('test');
      expect(result.activeVersion?.template).toBe('Hello {{name}}');
    });

    it('throws PromptNotFoundError when slug not found', async () => {
      promptRepo.findBySlug.mockResolvedValue(undefined);
      await expect(service.getBySlug('missing')).rejects.toThrow(PromptNotFoundError);
    });
  });

  describe('create', () => {
    it('wraps DuplicatePromptError into PromptAlreadyExistsError', async () => {
      promptRepo.create.mockRejectedValue(new DuplicatePromptError('test'));
      await expect(service.create({ name: 'Test', slug: 'test' })).rejects.toThrow(
        PromptAlreadyExistsError,
      );
    });
  });

  describe('resolve', () => {
    it('renders template with parameters', async () => {
      const record = {
        id: '1',
        name: 'Test',
        slug: 'test',
        parameterSchema: { name: { type: 'string' } },
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const version = {
        id: 'v1',
        promptId: '1',
        version: 1,
        template: 'Hello {{name}}, welcome!',
        isActive: true,
        createdAt: new Date(),
      };
      promptRepo.findBySlug.mockResolvedValue(record);
      versionRepo.findActiveByPromptId.mockResolvedValue(version);

      const result = await service.resolve('test', { name: 'World' });
      expect(result.text).toBe('Hello World, welcome!');
      expect(result.version).toBe(1);
    });

    it('throws when no active version exists', async () => {
      const record = {
        id: '1',
        name: 'Test',
        slug: 'test',
        parameterSchema: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      promptRepo.findBySlug.mockResolvedValue(record);
      versionRepo.findActiveByPromptId.mockResolvedValue(undefined);

      await expect(service.resolve('test', {})).rejects.toThrow(PromptNotFoundError);
    });
  });
});
