import { describe, expect, it, vi } from 'vitest';
import { createBase44RecordingManifestStore } from '../../../base44/shared/base44RecordingManifestStore';

const manifest = {
  athlete_id: 'athlete-a', session_id: 'session-a', state: 'complete' as const,
  version: 1 as const, chunk_count: 17, sample_count: 5041,
  first_time_s: 0, last_time_s: 5040, recording_sha256: 'a'.repeat(64),
};

describe('Base44 scoped full-recording manifest store (synthetic, no writes)', () => {
  it('reads exactly scoped, verified-looking metadata using bounded query', async () => {
    const filter = vi.fn().mockResolvedValue([manifest]);
    const store = createBase44RecordingManifestStore({ filter, create: vi.fn() }, 'athlete-a', 'session-a');
    expect(await store.listAll()).toEqual({ complete: true, rows: [manifest] });
    expect(filter).toHaveBeenCalledWith({ athlete_id: 'athlete-a', session_id: 'session-a' }, 'created_date', 3, 0);
  });
  it('rejects overflow, cross-athlete rows, and malformed manifest', async () => {
    for (const rows of [
      [manifest, manifest, manifest],
      [{ ...manifest, athlete_id: 'athlete-b' }],
      [{ ...manifest, recording_sha256: 'not-a-digest' }],
      [{ ...manifest, state: 'pending' }],
    ]) {
      const store = createBase44RecordingManifestStore({
        filter: vi.fn().mockResolvedValue(rows), create: vi.fn(),
      }, 'athlete-a', 'session-a');
      expect((await store.listAll()).complete).toBe(false);
    }
  });
  it('fails closed when listing errors or yields an unbounded result', async () => {
    const store = createBase44RecordingManifestStore({
      filter: vi.fn().mockRejectedValue(new Error('service unavailable')), create: vi.fn(),
    }, 'athlete-a', 'session-a');
    expect(await store.listAll()).toEqual({ complete: false, rows: [] });
  });
  it('never writes cross-scope or incomplete manifests', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'synthetic' });
    const store = createBase44RecordingManifestStore({ filter: vi.fn(), create }, 'athlete-a', 'session-a');
    await expect(store.create({ ...manifest, session_id: 'other' })).rejects.toThrow();
    await expect(store.create({ ...manifest, state: 'pending' } as any)).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
    await store.create(manifest);
    expect(create).toHaveBeenCalledOnce();
  });
});
