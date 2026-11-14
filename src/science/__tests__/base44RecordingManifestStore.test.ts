import { describe, expect, it, vi } from 'vitest';
import { createScopedRecordingManifestStore } from '../../../base44/shared/base44RecordingManifestStore';

const scope = { athlete_id: 'athlete-a', session_id: 'session-a' };
const row = { ...scope, state: 'complete' as const, version: 1 as const,
  sample_count: 5041, chunk_count: 17, first_time_s: 0, last_time_s: 5040,
  recording_sha256: 'a'.repeat(64) };

describe('Base44 scoped manifest store', () => {
  it('uses both athlete and session identifiers and detects duplicate manifests', async () => {
    const filter = vi.fn(async () => [row, row]);
    const store = createScopedRecordingManifestStore({ filter, create: vi.fn() }, scope.athlete_id, scope.session_id);
    expect(await store.listAll()).toMatchObject({ complete: false, rows: [] });
    expect(filter).toHaveBeenCalledWith(scope, 'created_date', 2, 0);
  });
  it('fails closed on cross-scope rows or unavailable storage', async () => {
    const entity = { filter: vi.fn(async () => [{ ...row, athlete_id: 'other' }]), create: vi.fn() };
    const store = createScopedRecordingManifestStore(entity, scope.athlete_id, scope.session_id);
    expect((await store.listAll()).complete).toBe(false);
    entity.filter.mockRejectedValueOnce(Error('offline'));
    expect((await store.listAll()).complete).toBe(false);
  });
  it('rejects cross-scope or malformed writes before contacting storage', async () => {
    const create = vi.fn();
    const store = createScopedRecordingManifestStore({ filter: vi.fn(), create }, scope.athlete_id, scope.session_id);
    await expect(store.create({ ...row, session_id: 'other' })).rejects.toThrow();
    await expect(store.create({ ...row, recording_sha256: 'bad' })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
    await store.create(row);
    expect(create).toHaveBeenCalledWith(row);
  });
});
