// Scoped, exhaustively paginated transport adapter for the recording chunk
// persistence protocol. Not connected to live Base44 functions or entity APIs.
// The caller supplies a service-role transport whose page query MUST apply
// BOTH athlete_id and session_id at the database, not merely after fetching.
// A terminal empty page is mandatory: a full page is NOT proof of completion.
// No concurrent writers: a per-session lock / unique DB key remains a release gate.
// @ts-ignore Explicit Deno .ts extension is required at runtime.
import type { ChunkRow, ChunkStore, CompleteChunkRead } from './recordingChunkPersistence.ts';

export type ChunkTransport = {
  fetchPage: (
    scope: { athlete_id: string; session_id: string },
    limit: number,
    offset: number,
  ) => Promise<unknown>;
  createRows: (rows: ChunkRow[]) => Promise<unknown>;
};

export function createScopedChunkStore(
  athleteId: string,
  sessionId: string,
  transport: ChunkTransport,
  pageSize = 20,
): ChunkStore {
  if (!athleteId?.trim() || !sessionId?.trim() ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20 ||
      typeof transport?.fetchPage !== 'function' ||
      typeof transport?.createRows !== 'function') {
    throw new Error('Invalid chunk adapter configuration');
  }
  const scope = { athlete_id: athleteId, session_id: sessionId };
  return {
    async listAll(): Promise<CompleteChunkRead> {
      const rows: ChunkRow[] = [];
      const rowIds = new Set<string>();
      // One extra query after max capacity ensures no hidden overflow.
      // The adapter intentionally never claims complete if there are >96 rows.
      for (let offset = 0; offset <= 96; offset += pageSize) {
        const page = await transport.fetchPage(scope, pageSize, offset);
        if (!Array.isArray(page) || page.length > pageSize) {
          return { complete: false, rows: [] };
        }
        for (const row of page) {
          if (!row || row.athlete_id !== athleteId || row.session_id !== sessionId ||
            !Number.isInteger(row.chunk_index) || row.chunk_index < 0 ||
            (typeof row.id === 'string' && rowIds.has(row.id))) {
            return { complete: false, rows: [] };
          }
          if (typeof row.id === 'string') rowIds.add(row.id);
          rows.push(row as ChunkRow);
        }
        if (rows.length > 96) return { complete: false, rows: [] };
        // A short page is enough under a correct offset-paginated query.
        // An exact-full page MUST trigger a follow-up fetch.
        if (page.length < pageSize) return { complete: true, rows };
      }
      return { complete: false, rows: [] };
    },
    async createBatch(rows: ChunkRow[]): Promise<unknown> {
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > 5 ||
        rows.some(row => !row ||
          row.athlete_id !== athleteId || row.session_id !== sessionId ||
          !Number.isInteger(row.chunk_index) || row.chunk_index < 0 || row.chunk_index >= 96 ||
          typeof row.content_sha256 !== 'string' ||
          !/^[0-9a-f]{64}$/.test(row.content_sha256))) {
        throw new Error('Chunk write rejected: invalid or cross-scope rows');
      }
      return transport.createRows(rows);
    },
  };
}

// Check identities against backend-fetched records; never authorize based
// solely on athlete_id/session_id supplied by a request body.
// This guard is deliberately separate from RLS and uses server user identity.
export async function authorizeRecordingChunkScope(
  user: { id?: string; role?: string } | null | undefined,
  athleteId: string,
  sessionId: string,
  fetchAthlete: (athleteId: string) => Promise<any>,
  fetchSession: (sessionId: string) => Promise<any>,
): Promise<boolean> {
  if (!user?.id || !athleteId?.trim() || !sessionId?.trim() ||
    typeof fetchAthlete !== 'function' || typeof fetchSession !== 'function') return false;
  let athlete: any;
  let session: any;
  try {
    [athlete, session] = await Promise.all([
      fetchAthlete(athleteId), fetchSession(sessionId),
    ]);
  } catch { return false; }
  if (!athlete || !session || athlete.id !== athleteId ||
    session.id !== sessionId || session.athlete_id !== athleteId) return false;
  // Only an owner may invoke ordinary athlete-scoped writes.
  // An authenticated backend administrator can perform maintenance.
  return user.role === 'admin' || athlete.created_by_id === user.id;
}
