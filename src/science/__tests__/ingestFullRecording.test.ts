import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { ingestFullRecording } from '../../../base44/shared/ingestFullRecording';
const cryptoApi = webcrypto as unknown as Crypto;
const samples = (n: number) => Array.from({ length: n }, (_, time) => ({ time, heart_rate: 130, power: time % 5 === 0 ? 0 : 210 }));
function fakeStores() {
  const chunks: any[] = [], manifests: any[] = [];
  const chunkStore = {
    listAll: vi.fn(async () => ({ complete: true, rows: [...chunks] })),
    createBatch: vi.fn(async (rows: any[]) => { chunks.push(...rows); }),
  };
  const manifestStore = {
    listAll: vi.fn(async () => ({ complete: true, rows: [...manifests] })),
    create: vi.fn(async (row: any) => { manifests.push(row); }),
  };
  const lease = { runExclusive: async (_scope: any, work: () => Promise<any>) => work() };
  return { chunkStore, manifestStore, lease, chunks, manifests };
}
const input = (n: number, duration = n - 1) =>
  ({ athlete_id: 'test-owner', session_id: 'test-session', duration_seconds: duration, samples: samples(n) });
describe('release-gated complete recording ingest coordinator', () => {
  it('persists and verifies every sample of an 84-minute ride', async () => {
    const db = fakeStores();
    const result = await ingestFullRecording(input(5041), db, cryptoApi);
    expect(result).toEqual({ status: 'complete', sample_count: 5041, source: 'verified_chunks' });
    expect(db.chunks).toHaveLength(17);
    expect(db.manifests).toHaveLength(1);
    expect(db.chunks[0].samples[0].power).toBe(0);
  });
  it('refuses a truncated prefix without writing anything', async () => {
    const db = fakeStores();
    expect(await ingestFullRecording(input(3600, 5040), db, cryptoApi))
      .toMatchObject({ status: 'blocked', reason: 'incomplete_duration_coverage' });
    expect(db.chunkStore.createBatch).not.toHaveBeenCalled();
    expect(db.manifestStore.create).not.toHaveBeenCalled();
  });
  it('does not claim success after a partial write', async () => {
    const db = fakeStores();
    db.chunkStore.createBatch.mockImplementation(async rows => { db.chunks.push(rows[0]); });
    expect((await ingestFullRecording(input(601), db, cryptoApi)).status).toBe('incomplete');
    expect(db.manifests).toHaveLength(0);
  });
  it('rejects unsupported oversized recordings without any writes', async () => {
    const db = fakeStores();
    expect(await ingestFullRecording(input(28801), db, cryptoApi))
      .toMatchObject({ status: 'blocked', reason: 'exceeds_chunk_budget' });
    expect(db.chunkStore.createBatch).not.toHaveBeenCalled();
  });
});
