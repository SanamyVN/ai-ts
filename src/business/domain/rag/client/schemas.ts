import { z } from 'zod';

const ragContentSchema = z.object({
  type: z.enum(['text', 'html', 'markdown', 'json']),
  data: z.string(),
});

const chunkOptionsSchema = z.object({
  strategy: z
    .enum([
      'recursive',
      'character',
      'token',
      'markdown',
      'html',
      'json',
      'latex',
      'sentence',
      'semantic-markdown',
    ])
    .optional(),
  maxSize: z.number().positive().optional(),
  overlap: z.number().nonnegative().optional(),
});

const documentInputSchema = z.object({
  documentId: z.string(),
  content: ragContentSchema,
});

export const ingestClientSchema = z.object({
  indexName: z.string(),
  scopeId: z.string(),
  documents: z.array(documentInputSchema).min(1),
  chunkOptions: chunkOptionsSchema.optional(),
});

export type IngestClientInput = z.infer<typeof ingestClientSchema>;

export const deleteClientSchema = z.object({
  indexName: z.string(),
  scopeId: z.string(),
  filter: z.record(z.string(), z.unknown()),
});

export type DeleteClientInput = z.infer<typeof deleteClientSchema>;

export const replaceClientSchema = z.object({
  indexName: z.string(),
  scopeId: z.string(),
  documentId: z.string(),
  content: ragContentSchema,
  chunkOptions: chunkOptionsSchema.optional(),
});

export type ReplaceClientInput = z.infer<typeof replaceClientSchema>;

export const ingestResultSchema = z.object({
  chunksStored: z.number(),
});

export type IngestClientResult = z.infer<typeof ingestResultSchema>;

export const deleteResultSchema = z.object({
  chunksDeleted: z.number(),
});

export type DeleteClientResult = z.infer<typeof deleteResultSchema>;

export const replaceResultSchema = z.object({
  chunksDeleted: z.number(),
  chunksStored: z.number(),
});

export type ReplaceClientResult = z.infer<typeof replaceResultSchema>;

export const searchClientSchema = z.object({
  indexName: z.string().min(1),
  scopeId: z.string(),
  queryText: z.string().min(1),
  topK: z.number().int().positive(),
});

export type SearchClientInput = z.infer<typeof searchClientSchema>;

export const searchResultItemSchema = z.object({
  text: z.string(),
  score: z.number(),
});

export const searchResultSchema = z.object({
  results: z.array(searchResultItemSchema),
});

export type SearchClientResult = z.infer<typeof searchResultSchema>;
