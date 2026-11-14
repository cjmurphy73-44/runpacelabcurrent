import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { planRecordingChunks } from '../../../base44/shared/recordingChunks';
import { prepareRecordingManifest } from '../../../base44/shared/recordingChunkManifest';
import { readFullSessionRecording } from '../../../base44/shared/fullSessionRecording';

const cryptoApi = webcrypto as unknown as Crypto;
const scope = { athlete_id: 'athlete-test', session_id: 'session-test' };
async function fixture(count: number, offset = 0) {
  const raw = Array.from({ length: count }, (_, i) => ({
    time: i + offset, heart_rate: 140, power: i % 2 ? 0 : 200,
  }));
  const plan = planRecordingChunks(raw);
  if (!plan.ok) throw Error('bad fixture');
  const prepared = await prepareRecordingManifest(scope.athlete_id, scope.session_id, plan.chunks, cryptoApi);
  if (!prepared) throw Error('bad manifest');
  return prepared;
}
describe('full-session verified telemetry gateway', () => {
  it('releases all 5041 measured samples for a verified 84-minute ride', async () => {
    const { manifest, rows } = await fixture(5041);
    const result = await readFullSessionRecording(scope, 5040, manifest,
      async () => ({ complete: true, rows }), cryptoApi);
    expect(result).toMatchObject({ ok: true, sample_count: 5041, duration_coverage: 'complete' });
    if (result.ok) expect(result.samples[1].power).toBe(0);
  });
  it('rejects a perfectly hashed but truncated 60-minute prefix', async () => {
    const { manifest, rows } = await fixture(3600);
    const result = await readFullSessionRecording(scope, 5040, manifest,
      async () => ({ complete: true, rows }), cryptoApi);
    expect(result).toMatchObject({ ok: false, reason: 'incomplete_session_duration_coverage', samples: [] });
  });
  it('rejects shifted start even with a complete duration span', async () => {
    const { manifest, rows } = await fixture(601, 100);
    expect(await readFullSessionRecording(scope, 600, manifest,
      async () => ({ complete: true, rows }), cryptoApi))
      .toMatchObject({ ok: false, reason: 'incomplete_session_duration_coverage' });
  });
  it('does not leak partial samples from incomplete chunk reads', async () => {
    const { manifest, rows } = await fixture(601);
    expect(await readFullSessionRecording(scope, 600, manifest,
      async () => ({ complete: false, rows }), cryptoApi))
      .toMatchObject({ ok: false, reason: 'incomplete_chunk_read', samples: [] });
  });
  it('fails closed on cross-athlete scope and invalid session duration', async () => {
    const { manifest, rows } = await fixture(601);
    const read = async () => ({ complete: true, rows });
    expect(await readFullSessionRecording({ ...scope, athlete_id: 'other' }, 600, manifest, read, cryptoApi))
      .toMatchObject({ ok: false, reason: 'invalid_or_cross_scope_manifest', samples: [] });
    expect(await readFullSessionRecording(scope, 0, manifest, read, cryptoApi))
      .toMatchObject({ ok: false, reason: 'invalid_session_duration', samples: [] });
  });
});
