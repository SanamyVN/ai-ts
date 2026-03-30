import { describe, expect, it } from 'vitest';
import { aiConfigSchema } from './config.js';

describe('aiConfigSchema', () => {
  it('provides defaults when no config given', () => {
    const config = aiConfigSchema.parse({});
    expect(config.defaultModel).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.prompt.maxVersions).toBe(50);
    expect(config.session.transcriptPageSize).toBe(100);
    expect(config.embeddingModel).toBe('openai/text-embedding-3-small');
    expect(config.embeddingDimension).toBe(1536);
  });

  it('accepts custom model', () => {
    const config = aiConfigSchema.parse({ defaultModel: 'openai/gpt-4o' });
    expect(config.defaultModel).toBe('openai/gpt-4o');
  });

  it('rejects invalid config', () => {
    const result = aiConfigSchema.safeParse({ defaultModel: 123 });
    expect(result.success).toBe(false);
  });

  it('accepts voice mapping with non-empty male and female keys', () => {
    const config = aiConfigSchema.parse({
      voices: { tts: { male: 'alloy', female: 'nova' } },
    });

    expect(config.voices).toBeDefined();
    expect(config.voices?.tts.male).toBe('alloy');
    expect(config.voices?.tts.female).toBe('nova');
  });

  it('rejects empty male voice identifier', () => {
    const result = aiConfigSchema.safeParse({
      voices: { tts: { male: '', female: 'nova' } },
    });

    expect(result.success).toBe(false);
  });
});
