import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { planRecordingChunks } from '../../../base44/shared/recordingChunks';
import { prepareRecordingManifest, verifyRecordingReadback } from '../../../base44/shared/recordingChunkManifest';

const cryptoApi = webcrypto as unknown as Crypto;
const synthetic = (count: number) => Array.from({ length: count }, (_, time) => ({
  time, heart_rate: 120 + time % 35, distance: time * 5,
  speed: 5, power: time % 20 === 0 ? 0 : 190,
}));
async function fixture(count = 5041) {
  const planned = planRecordingChunks(synthetic(count));
  if (!planned.ok) throw Error('Synthetic recording planner rejected input');
  const prepared = await prepareRecordingManifest('synthetic-athlete', 'synthetic-session', planned.chunks, cryptoApi);
  if (!prepared) throw Error('Manifest failed');
  return prepared;
}
describe('full-duration chunk manifest and readback contract', () => {
  it('verifies a complete 84-minute recording and unchanged watts', async () => {
    const { manifest, rows } = await fixture();
    expect(manifest).toMatchObject({ chunk_count: 17, sample_count: 5041, first_time_s: 0, last_time_s: 5040 });
    expect(rows[0].samples[0].power).toBe(0);
    expect(await verifyRecordingReadback(manifest, rows, cryptoApi)).toBe(true);
  });
  it('fails closed when a batch returns partial records', async () => {
    const { manifest, rows } = await fixture(601);
    expect(await verifyRecordingReadback(manifest, rows.slice(0, -1), cryptoApi)).toBe(false);
  });
  it('rejects duplicated indices and rows attached to another athlete or workout', async () => {
    const { manifest, rows } = await fixture(601);
    expect(await verifyRecordingReadback(manifest, [...rows.slice(0, -1), rows[0]], cryptoApi)).toBe(false);
    expect(await verifyRecordingReadback(manifest, rows.map(r => ({ ...r, athlete_id: 'other-athlete' })), cryptoApi)).toBe(false);
    expect(await verifyRecordingReadback(manifest, rows.map(r => ({ ...r, session_id: 'other-session' })), cryptoApi)).toBe(false);
  });
  it('detects changed measured HR and power even with the same timestamps and row count', async () => {
    const { manifest, rows } = await fixture(601);
    const tampered = rows.map((row, i) => i === 0 ? {
      ...row,
      samples: row.samples.map((sample: any, index: number) =>
        index === 20 ? { ...sample, power: 900, heart_rate: 199 } : sample),
    } : row);
    expect(await verifyRecordingReadback(manifest, tampered, cryptoApi)).toBe(false);
  });
  it('supports shuffled query result order only when chunk indices remain complete', async () => {
    const { manifest, rows } = await fixture(601);
    expect(await verifyRecordingReadback(manifest, [...rows].reverse(), cryptoApi)).toBe(true);
  });
});
