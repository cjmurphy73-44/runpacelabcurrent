// Source-only Base44 adapter for the durable full-recording commit protocol.
// Not wired to ingestion: callers still MUST provide authenticated ownership,
// service-role access and a database-backed fenced exclusive lease.
// An ambiguous/duplicate manifest must never be treated as a complete recording.
import type { DurableRecordingManifest, ManifestStore } from './recordingSessionCommit.ts';

type ManifestEntity = {
  filter: (query: { athlete_id: string; session_id: string }, sort: string, limit: number, skip: number) => Promise<unknown>;
  create: (row: DurableRecordingManifest) => Promise<unknown>;
};

export function createBase44RecordingManifestStore(
  entity: ManifestEntity, athleteId: string, sessionId: string,
): ManifestStore {
  if (!entity || typeof entity.filter !== 'function' || typeof entity.create !== 'function' ||
      typeof athleteId !== 'string' || !athleteId.trim() ||
      typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new Error('Invalid scoped recording manifest store');
  }
  const scope = { athlete_id: athleteId, session_id: sessionId };
  return {
    async listAll() {
      const failed = () => ({ complete: false, rows: [] as DurableRecordingManifest[] });
      try {
        // Fetch up to two rows. A third row is an overflow, never a success.
        // No writes are allowed while reading: a durable exclusive lease is required.
        const result = await entity.filter(scope, 'created_date', 3, 0);
        if (!Array.isArray(result) || result.length > 2) return failed();
        const rows: DurableRecordingManifest[] = [];
        const ids = new Set<string>();
        for (const item of result) {
          const row = item as DurableRecordingManifest & { id?: string };
          if (!row || row.athlete_id !== athleteId || row.session_id !== sessionId ||
              row.state !== 'complete' || row.version !== 1 ||
              !Number.isInteger(row.chunk_count) || row.chunk_count < 1 || row.chunk_count > 96 ||
              !Number.isInteger(row.sample_count) || row.sample_count < 2 ||
              !/^[a-f0-9]{64}$/.test(row.recording_sha256 || '') ||
              (typeof row.id === 'string' && ids.has(row.id))) return failed();
          if (typeof row.id === 'string') ids.add(row.id);
          rows.push(row);
        }
        return { complete: true, rows };
      } catch { return failed(); }
    },
    async create(row) {
      if (!row || row.athlete_id !== athleteId || row.session_id !== sessionId ||
          row.state !== 'complete' || row.version !== 1 ||
          !Number.isInteger(row.chunk_count) || row.chunk_count < 1 || row.chunk_count > 96 ||
          !Number.isInteger(row.sample_count) || row.sample_count < 2 ||
          !Number.isFinite(row.first_time_s) || !Number.isFinite(row.last_time_s) ||
          row.last_time_s <= row.first_time_s ||
          !/^[a-f0-9]{64}$/.test(row.recording_sha256 || '')) {
        throw new Error('Invalid or cross-scope recording manifest');
      }
      return entity.create(row);
    },
  };
}
