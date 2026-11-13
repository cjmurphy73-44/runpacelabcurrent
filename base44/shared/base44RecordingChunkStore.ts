// Base44 service-role chunk store for the actual documented SDK interface:
// entity.filter(query, sort?, limit?, skip?) => row array.
// This adapter is SOURCE ONLY. No live backend invokes it.
// Caller MUST enforce athlete ownership and supply a durable exclusive
// per-session lock. Offset paging is unsafe under concurrent mutation without
// that lock. We fail closed on duplicate indices, malformed rows or overflow.
// @ts-ignore Deno runtime requires explicit .ts extension.
import type { ChunkStore, ChunkRow, CompleteChunkRead } from './recordingChunkPersistence.ts';

type EntityHandler = {
  filter: (query: { athlete_id: string; session_id: string },
    sort: string, limit: number, skip: number) => Promise<unknown>;
  bulkCreate: (rows: ChunkRow[]) => Promise<unknown>;
};

export const BASE44_CHUNK_PAGE_SIZE = 20;
export const BASE44_MAX_CHUNK_ROWS = 96;

// The SDK's filter returns an ARRAY, not cursor metadata. A short/empty page
// after an exact-full page is the terminal condition; under the caller's
// required durable exclusive lock, a stable ascending sort is expected.
// Reading a non-snapshot concurrent dataset cannot be declared complete.
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
      const indices = new Set<number>();
      const recordIds = new Set<string>();
      // Hard maximum 96 rows, plus enough requests to detect 97th.
      for (let offset = 0; offset <= BASE44_MAX_CHUNK_ROWS; offset += BASE44_CHUNK_PAGE_SIZE) {
        let result: unknown;
        try {
          result = await entity.filter(scope, 'chunk_index', BASE44_CHUNK_PAGE_SIZE, offset);
        } catch {
          return failed();
        }
        if (!Array.isArray(result) || result.length > BASE44_CHUNK_PAGE_SIZE) return failed();
        for (const item of result) {
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
        if (result.length < BASE44_CHUNK_PAGE_SIZE) {
          // A stable, complete result must have contiguous chunk indices.
          // Existing missing indices are valid for recovery; out-of-order
          // rows imply an unstable sort or offset-paging race.
          for (let i = 1; i < rows.length; i++) {
            if (rows[i].chunk_index <= rows[i - 1].chunk_index) return failed();
          }
          return { rows, complete: true };
        }
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
