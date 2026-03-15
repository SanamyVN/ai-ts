import { z } from 'zod';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';

const promptConfigSchema = z.object({
  maxVersions: z.number().int().positive().default(50),
});

const sessionConfigSchema = z.object({
  transcriptPageSize: z.number().int().positive().default(100),
});

export const aiConfigSchema = z.object({
  defaultModel: z.string().default('anthropic/claude-sonnet-4-20250514'),
  prompt: promptConfigSchema.default({ maxVersions: 50 }),
  session: sessionConfigSchema.default({ transcriptPageSize: 100 }),
});

export type AiConfig = z.infer<typeof aiConfigSchema>;
export type AiConfigInput = z.input<typeof aiConfigSchema>;

export const AI_CONFIG = createToken<AiConfig>('AI_CONFIG');
