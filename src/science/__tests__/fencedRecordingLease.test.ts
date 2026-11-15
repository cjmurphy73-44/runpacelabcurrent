import { describe, expect, it, vi } from 'vitest';
import { createFencedRecordingLease } from '../../../base44/shared/fencedRecordingLease';

const scope = { athlete_id: 'a', session_id: 's' };
const grant = { token: 'owner-1', fence: 7, expires_at_ms: 110000 };
const provider = () => ({
  acquire: vi.fn(async () => grant),
  assertCurrent: vi.fn(async () => true),
  releaseIfOwner: vi.fn(async () => {}),
});
describe('fenced lease adapter, external atomic provider required', () => {
  it('holds the same scope through pre/post fence checks and owner release', async () => {
    const p = provider();
    const lease = createFencedRecordingLease(p, () => 100000);
    expect(await lease.runExclusive(scope, async () => 'committed')).toBe('committed');
    expect(p.assertCurrent).toHaveBeenCalledTimes(2);
    expect(p.releaseIfOwner).toHaveBeenCalledTimes(1);
    expect(p.acquire.mock.calls[0][0]).toContain('"recording"');
  });
  it('rejects unacquired lease and never calls the writer', async () => {
    const p = provider();
    p.acquire.mockResolvedValueOnce(null as any);
    const work = vi.fn();
    await expect(createFencedRecordingLease(p, () => 100000).runExclusive(scope, work)).rejects.toThrow('lease_not_acquired');
    expect(work).not.toHaveBeenCalled();
  });
  it('fails if the fence is lost before or after work', async () => {
    const p = provider();
    p.assertCurrent.mockResolvedValueOnce(false);
    const work = vi.fn();
    await expect(createFencedRecordingLease(p, () => 100000).runExclusive(scope, work)).rejects.toThrow('lease_fence_lost');
    expect(work).not.toHaveBeenCalled();
    expect(p.releaseIfOwner).toHaveBeenCalledTimes(1);
    const q = provider();
    q.assertCurrent.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(createFencedRecordingLease(q, () => 100000).runExclusive(scope, async () => 'done')).rejects.toThrow('lease_fence_lost');
  });
  it('rejects expired grant and releases after writer failure', async () => {
    const p = provider();
    p.acquire.mockResolvedValueOnce({ ...grant, expires_at_ms: 99999 });
    await expect(createFencedRecordingLease(p, () => 100000).runExclusive(scope, async () => {})).rejects.toThrow('lease_not_acquired');
    const q = provider();
    await expect(createFencedRecordingLease(q, () => 100000).runExclusive(scope, async () => { throw Error('write_failed'); })).rejects.toThrow('write_failed');
    expect(q.releaseIfOwner).toHaveBeenCalledTimes(1);
  });
});
