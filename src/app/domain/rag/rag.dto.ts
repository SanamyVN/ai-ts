import { z } from 'zod';

const ragContentDto = z.object({
  type: z.enum(['text', 'html', 'markdown', 'json']),
  data: z.string().min(1),
});

const chunkOptionsDto = z.object({
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

export const ingestRequestDto = z.object({
  indexName: z.string().min(1),
  scopeId: z.string().check(z.uuid()),
  documents: z
    .array(
      z.object({
        documentId: z.string().check(z.uuid()),
        content: ragContentDto,
      }),
    )
    .min(1),
  chunkOptions: chunkOptionsDto.optional(),
});
export type IngestRequestDto = z.infer<typeof ingestRequestDto>;

export const ingestResponseDto = z.object({
  chunksStored: z.number().nonnegative(),
});
export type IngestResponseDto = z.infer<typeof ingestResponseDto>;

export const deleteRequestDto = z.object({
  indexName: z.string().min(1),
  scopeId: z.string().check(z.uuid()),
  filter: z.record(z.string(), z.unknown()),
});
export type DeleteRequestDto = z.infer<typeof deleteRequestDto>;

export const deleteResponseDto = z.object({
  chunksDeleted: z.number().nonnegative(),
});
export type DeleteResponseDto = z.infer<typeof deleteResponseDto>;

export const replaceParamsDto = z.object({
  documentId: z.string().check(z.uuid()),
});

export const replaceRequestDto = z.object({
  indexName: z.string().min(1),
  scopeId: z.string().check(z.uuid()),
  content: ragContentDto,
  chunkOptions: chunkOptionsDto.optional(),
});
export type ReplaceRequestDto = z.infer<typeof replaceRequestDto>;

export const replaceResponseDto = z.object({
  chunksDeleted: z.number().nonnegative(),
  chunksStored: z.number().nonnegative(),
});
export type ReplaceResponseDto = z.infer<typeof replaceResponseDto>;

export const searchRequestDto = z.object({
  indexName: z.string().min(1),
  scopeId: z.string().check(z.uuid()),
  queryText: z.string().min(1),
  topK: z.number().int().positive().default(5),
});
export type SearchRequestDto = z.infer<typeof searchRequestDto>;

const searchResultItemDto = z.object({
  text: z.string(),
  score: z.number(),
});

export const searchResponseDto = z.object({
  results: z.array(searchResultItemDto),
});
export type SearchResponseDto = z.infer<typeof searchResponseDto>;
