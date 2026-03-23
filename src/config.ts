import { z } from 'zod';
import { createToken } from '@sanamyvn/foundation/di/core/tokens';

const promptConfigSchema = z.object({
  maxVersions: z.number().int().positive().default(50),
});

const sessionConfigSchema = z.object({
  transcriptPageSize: z.number().int().positive().default(100),
});

const openaiCompatibleProviderSchema = z.object({
  url: z.url(),
  apiKey: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

const vadConfigSchema = z.object({
  speechThreshold: z.number().optional(),
  silenceThreshold: z.number().optional(),
  minSpeechFrames: z.number().int().optional(),
  minSilenceDurationMs: z.number().int().optional(),
});

/** Zod schema that validates and provides defaults for the AI module configuration. */
export const aiConfigSchema = z.object({
  defaultModel: z.string().default('anthropic/claude-sonnet-4-20250514'),
  prompt: promptConfigSchema.default({ maxVersions: 50 }),
  session: sessionConfigSchema.default({ transcriptPageSize: 100 }),
  embeddingModel: z.string().default('openai/text-embedding-3-small'),
  embeddingDimension: z.number().int().positive().default(1536),
  embeddingProvider: openaiCompatibleProviderSchema.optional(),
  modelProvider: openaiCompatibleProviderSchema.optional(),
  sttModel: z.string().optional(),
  sttProvider: openaiCompatibleProviderSchema.optional(),
  ttsModel: z.string().optional(),
  ttsProvider: openaiCompatibleProviderSchema.optional(),
  vad: vadConfigSchema.optional(),
});

export type AiConfig = z.infer<typeof aiConfigSchema>;
export type AiConfigInput = z.input<typeof aiConfigSchema>;

/** DI token for the validated AI module configuration — bound during module setup. */
export const AI_CONFIG = createToken<AiConfig>('AI_CONFIG');
