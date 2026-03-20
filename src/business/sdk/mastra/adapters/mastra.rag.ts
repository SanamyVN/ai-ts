import type { PgVector } from '@mastra/pg';
import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import { MASTRA_CORE_RAG } from '../mastra.interface.js';
import type { IMastraRag } from '../mastra.interface.js';
import { MastraAdapterError } from '../mastra.error.js';

/**
 * Wraps a `@mastra/pg` PgVector instance behind the stable `IMastraRag` interface.
 * All exceptions from PgVector are caught here and re-thrown as `MastraAdapterError`
 * so callers never see raw Mastra errors.
 */
@Injectable()
export class MastraRagAdapter implements IMastraRag {
  constructor(@Inject(MASTRA_CORE_RAG) private readonly pgVector: PgVector) {}

  async upsert(
    indexName: string,
    vectors: number[][],
    metadata: Record<string, unknown>[],
  ): Promise<number> {
    try {
      await this.pgVector.upsert({ indexName, vectors, metadata });
      return vectors.length;
    } catch (error) {
      throw new MastraAdapterError('upsert', error);
    }
  }

  async delete(indexName: string, filter: Record<string, unknown>): Promise<number> {
    try {
      // PGVectorFilter is an internal type not exported from @mastra/pg.
      // Cast through unknown to satisfy the internal filter type requirement.
      type DeleteParams = Parameters<PgVector['deleteVectors']>[0];
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      await this.pgVector.deleteVectors({ indexName, filter } as DeleteParams);
      // PgVector.deleteVectors returns void — no count is available from the API.
      return 0;
    } catch (error) {
      throw new MastraAdapterError('delete', error);
    }
  }

  async search(
    indexName: string,
    queryVector: number[],
    topK: number,
    scopeId: string,
  ): Promise<Array<{ text: string; score: number }>> {
    try {
      // PGVectorFilter is an internal type not exported from @mastra/pg.
      // Cast through the derived QueryParams type to satisfy the filter field.
      type QueryParams = Parameters<PgVector['query']>[0];
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const results = await this.pgVector.query({
        indexName,
        queryVector,
        topK,
        filter: { scopeId },
      } as QueryParams);
      return results.map((r) => ({
        text: (r.metadata?.['text'] as string | undefined) ?? '',
        score: r.score,
      }));
    } catch (error) {
      throw new MastraAdapterError('search', error);
    }
  }
}
