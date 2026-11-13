// Base44 service-role chunk store using documented cursor-based entity.filter.
// SOURCE-ONLY ADAPTER: NOT called by any deployed function.
// Caller must first authorize user against backend-fetched AthleteProfile and
// WorkoutSession, and must supply a per-session concurrency lock / unique key
// before any production write path is enabled. Service-role bypasses RLS.
// Never accept client-provided filters or a user SDK entity handler.
// @ts-ignore Deno runtime import extension.
import type { ChunkStore, ChunkRow, CompleteChunkRead } from './recordingChunkPersistence.ts';

type CursorPage = {
  items: unknown[];
  has_more: boolean;
  next_cursor: string | null;
};
type EntityHandler = {
  filter: (query: { athlete_id: string; session_id: string },
    options: { sort?: string; limit: number; cursor?: string }) => Promise<unknown>;
  bulkCreate: (rows: ChunkRow[]) => Promise<unknown>;
};

export const BASE44_CHUNK_PAGE_SIZE = 20;
export const BASE44_MAX_CHUNK_ROWS = 96;

// Official Base44 SDK entity.filter(query, { sort, limit, cursor }) returns
// { items, has_more, next_cursor }. The cursor includes the original query/sort.
// Always check for duplicate returned IDs/indices and for changed page tokens.
export function createBase44RecordingChunkStore(
  entity: EntityHandler,
  athleteId: string,
  sessionId: string,
): ChunkStore {
  if (!entity || typeof entity.filter !== 'function' ||
      typeof entity.bulkCreate !== 'function' ||
      typeof athleteId !== 'string' || !athleteId.trim() ||
      typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new Error('Invalid scoped Base44 recording chunk store');
  }
  const scope = { athlete_id: athleteId, session_id: sessionId };
  return {
    async listAll(): Promise<CompleteChunkRead> {
      const failed = (): CompleteChunkRead => ({ rows: [], complete: false });
      const rows: ChunkRow[] = [];
      const cursors = new Set<string>();
      const indices = new Set<number>();
      const recordIds = new Set<string>();
      let cursor: string | undefined;
      for (let pageNumber = 0; pageNumber < 7; pageNumber++) {
        let result: unknown;
        try {
          result = await entity.filter(scope, cursor
            ? { limit: BASE44_CHUNK_PAGE_SIZE, cursor }
            : { sort: 'chunk_index', limit: BASE44_CHUNK_PAGE_SIZE });
        } catch {
          return failed();
        }
        const page = result as CursorPage | null;
        if (!page || !Array.isArray(page.items) ||
          typeof page.has_more !== 'boolean' ||
          page.items.length > BASE44_CHUNK_PAGE_SIZE ||
          !(page.next_cursor === null || typeof page.next_cursor === 'string')) return failed();

        for (const item of page.items) {
          const row = item as ChunkRow & { id?: string };
          if (!row || row.athlete_id !== athleteId || row.session_id !== sessionId ||
            !Number.isInteger(row.chunk_index) || row.chunk_index < 0 ||
            row.chunk_index >= BASE44_MAX_CHUNK_ROWS ||
            indices.has(row.chunk_index) ||
            (typeof row.id === 'string' && recordIds.has(row.id))) return failed();
          indices.add(row.chunk_index);
          if (typeof row.id === 'string') recordIds.add(row.id);
          rows.push(row);
        }
        if (rows.length > BASE44_MAX_CHUNK_ROWS) return failed();

        if (!page.has_more) {
          if (page.next_cursor !== null) return failed();
          return { rows, complete: true };
        }
        // No progress, repeated cursor, or final-page cursor absent means
        // an incomplete read. Never present any partial samples.
        if (page.items.length === 0 || !page.next_cursor ||
          cursors.has(page.next_cursor)) return failed();
        cursors.add(page.next_cursor);
        cursor = page.next_cursor;
      }
      return failed();
    },
    async createBatch(rows: ChunkRow[]): Promise<unknown> {
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > 5 ||
        rows.some(row =>
          !row || row.athlete_id !== athleteId || row.session_id !== sessionId ||
          !Number.isInteger(row.chunk_index) || row.chunk_index < 0 ||
          row.chunk_index >= BASE44_MAX_CHUNK_ROWS ||
          !Number.isInteger(row.sample_count) || row.sample_count < 1 || row.sample_count > 300 ||
          !Array.isArray(row.samples) || row.samples.length !== row.sample_count ||
          !/^[0-9a-f]{64}$/.test(row.content_sha256 || ''))) {
        throw new Error('Invalid or cross-scope recording chunk batch');
      }
      const keys = rows.map(row => row.chunk_index);
      if (new Set(keys).size !== keys.length) throw new Error('Duplicate chunk index in write batch');
      return entity.bulkCreate(rows);
    },
  };
}
