// Base44 service-role manifest adapter. SOURCE ONLY; requires caller-supplied
// durable exclusive lease and authenticated athlete/session scope before use.
// @ts-ignore Deno runtime requires explicit .ts extension.
import type { ManifestStore, DurableRecordingManifest } from './recordingSessionCommit.ts';

type ManifestEntity = {
  filter: (query: { athlete_id: string; session_id: string }, sort: string, limit: number, skip: number) => Promise<unknown>;
  create: (row: DurableRecordingManifest) => Promise<unknown>;
};

export function createScopedRecordingManifestStore(
  entity: ManifestEntity, athleteId: string, sessionId: string,
): ManifestStore {
  if (!entity || typeof entity.filter !== 'function' || typeof entity.create !== 'function' ||
      typeof athleteId !== 'string' || !athleteId.trim() ||
      typeof sessionId !== 'string' || !sessionId.trim()) {
    throw Error('invalid_manifest_store_scope');
  }
  const scope = { athlete_id: athleteId, session_id: sessionId };
  return {
    async listAll() {
      // Request 2 rows to detect duplicate manifests; 2+ is never complete.
      // Caller must hold the durable exclusive lease to prevent page races.
      try {
        const rows = await entity.filter(scope, 'created_date', 2, 0);
        if (!Array.isArray(rows) || rows.length > 1 ||
            rows.some(row => !row || row.athlete_id !== athleteId || row.session_id !== sessionId)) {
          return { complete: false, rows: [] };
        }
        return { complete: true, rows: rows as DurableRecordingManifest[] };
      } catch {
        return { complete: false, rows: [] };
      }
    },
    async create(manifest) {
      if (!manifest || manifest.athlete_id !== athleteId || manifest.session_id !== sessionId ||
          manifest.state !== 'complete' || manifest.version !== 1 ||
          !Number.isSafeInteger(manifest.sample_count) || manifest.sample_count < 2 ||
          !Number.isSafeInteger(manifest.chunk_count) || manifest.chunk_count < 1 ||
          manifest.chunk_count > 96 || !/^[0-9a-f]{64}$/.test(manifest.recording_sha256 || '')) {
        throw Error('invalid_or_cross_scope_manifest');
      }
      return entity.create(manifest);
    },
  };
}
