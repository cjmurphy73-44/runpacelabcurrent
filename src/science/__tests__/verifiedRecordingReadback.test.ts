import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { planRecordingChunks } from '../../../base44/shared/recordingChunks';
import { prepareRecordingManifest } from '../../../base44/shared/recordingChunkManifest';
import { readVerifiedRecording } from '../../../base44/shared/verifiedRecordingReadback';

const cryptoApi = webcrypto as unknown as Crypto;
async function recording(count = 5041) {
  const raw = Array.from({ length: count }, (_, time) => ({
    time, heart_rate: 130 + time % 20, distance: time * 5,
    power: time % 13 === 0 ? 0 : 220, speed: 5,
  }));
  const planned = planRecordingChunks(raw);
  if (!planned.ok) throw Error('Invalid synthetic recording');
  const prepared = await prepareRecordingManifest('athlete-test', 'session-test', planned.chunks, cryptoApi);
  if (!prepared) throw Error('Invalid synthetic manifest');
  return prepared;
}
const scope = { athlete_id: 'athlete-test', session_id: 'session-test' };

describe('full-duration strict recording readback', () => {
  it('rebuilds all 5041 observations only after verifying all chunk hashes', async () => {
    const { manifest, rows } = await recording();
    const result = await readVerifiedRecording(scope, manifest,
      async () => ({ complete: true, rows: [...rows].reverse() }), cryptoApi);
    expect(result).toMatchObject({ ok: true, sample_count: 5041, start_time_s: 0, end_time_s: 5040, source: 'verified_chunks' });
    if (result.ok) {
      expect(result.samples).toHaveLength(5041);
      expect(result.samples[0].power).toBe(0);
      expect(result.samples[5040].time).toBe(5040);
    }
  });
  it('returns zero samples on a truncated page or missing final chunk', async () => {
    const { manifest, rows } = await recording();
    expect(await readVerifiedRecording(scope, manifest,
      async () => ({ complete: false, rows }), cryptoApi))
      .toMatchObject({ ok: false, reason: 'incomplete_chunk_read', samples: [] });
    expect(await readVerifiedRecording(scope, manifest,
      async () => ({ complete: true, rows: rows.slice(0, -1) }), cryptoApi))
      .toMatchObject({ ok: false, reason: 'missing_or_duplicate_chunks', samples: [] });
  });
  it('rejects tampered HR, same-index duplicates and cross-session manifests', async () => {
    const { manifest, rows } = await recording(601);
    const altered = [...rows];
    altered[0] = { ...rows[0], samples: rows[0].samples.map((p: any, i: number) =>
      i === 10 ? { ...p, heart_rate: 210 } : p) };
    expect(await readVerifiedRecording(scope, manifest,
      async () => ({ complete: true, rows: altered }), cryptoApi))
      .toMatchObject({ ok: false, reason: 'recording_integrity_failed', samples: [] });
    expect(await readVerifiedRecording(scope, manifest,
      async () => ({ complete: true, rows: [rows[0], rows[0], rows[2]] }), cryptoApi))
      .toMatchObject({ ok: false, samples: [] });
    expect(await readVerifiedRecording({ ...scope, session_id: 'different-session' }, manifest,
      async () => ({ complete: true, rows }), cryptoApi))
      .toMatchObject({ ok: false, reason: 'invalid_or_cross_scope_manifest', samples: [] });
  });
  it('does not provide a partial recording when storage read fails', async () => {
    const { manifest } = await recording(601);
    expect(await readVerifiedRecording(scope, manifest,
      async () => { throw Error('database outage'); }, cryptoApi))
      .toMatchObject({ ok: false, reason: 'chunk_read_failed', samples: [] });
  });
});
