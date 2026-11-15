import { describe, expect, it, vi } from 'vitest';
import { previewVerifiedLoadHistory } from '../../../base44/shared/verifiedLoadPreview';
import { recomputeCTLATLTSB } from '../../../base44/shared/ctlRecalc';

const sessions = [{ date: '2026-11-11', session_trimp: 40, load_source: 'stream' },
  { date: '2026-11-13', session_trimp: 80, load_source: 'stream' }];
const rest = [{ date: '2026-11-12', confirmed_rest: true }];
const verified = { timezoneVerified: true, completeRead: true };

describe('Science 1.6: controlled load integration', () => {
  it('previews continuous 42/7 EWMA only with confirmed rest and TRIMP', () => {
    const result = previewVerifiedLoadHistory(sessions, rest, '2026-11-13', verified);
    expect(result.eligible).toBe(true);
    if (!result.eligible) return;
    expect(result.points).toHaveLength(3);
    expect(result.points.map((p) => p.trimp)).toEqual([40, 0, 80]);
    expect(result.points[1].source).toBe('confirmed_rest');
    expect(result.points[0]).toMatchObject({ ctl: 40, atl: 40, tsb: 0 });
    expect(result.points[1].ctl).toBeCloseTo(40 * (1 - 2 / 43), 8);
    expect(result.points[1].atl).toBeCloseTo(40 * (1 - 2 / 8), 8);
    expect(result.points[2].tsb).toBeLessThan(0);
  });
  it('refuses missing days, unverified timezone and partial history', () => {
    expect(previewVerifiedLoadHistory(sessions, [], '2026-11-13', verified))
      .toMatchObject({ eligible: false, code: 'unverified_rest_day' });
    expect(previewVerifiedLoadHistory(sessions, rest, '2026-11-13', { ...verified, timezoneVerified: false }))
      .toMatchObject({ eligible: false, code: 'ATHLETE_TIMEZONE_UNVERIFIED' });
    expect(previewVerifiedLoadHistory(sessions, rest, '2026-11-13', { ...verified, completeRead: false }))
      .toMatchObject({ eligible: false, code: 'INCOMPLETE_HISTORY_READ' });
  });
  it('refuses mixed TRIMP/TSS rather than converting implicitly', () => {
    expect(previewVerifiedLoadHistory([...sessions, { date: '2026-11-13', session_tss: 55 }],
      rest, '2026-11-13', verified)).toMatchObject({ eligible: false, code: 'mixed_load_units' });
  });
  it('recalculation performs no writes even with a fully populated fixture', async () => {
    const workoutFilter = vi.fn().mockResolvedValue(sessions);
    const dailyFilter = vi.fn().mockResolvedValue(rest);
    const update = vi.fn();
    const create = vi.fn();
    const backend = { asServiceRole: { entities: {
      WorkoutSession: { filter: workoutFilter, create, update },
      DailyMetrics: { filter: dailyFilter, create, update },
      AthleteProfile: { update },
    } } };
    const result = await recomputeCTLATLTSB(backend, 'athlete-1');
    expect(result).toMatchObject({ success: false, code: 'HISTORY_RECALC_NOT_YET_SAFE' });
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(workoutFilter).toHaveBeenCalledWith({ athlete_id: 'athlete-1' }, 'date', 5000);
  });
  it('refuses a truncated or malformed history read before any mutation', async () => {
    const update = vi.fn();
    const backend = { asServiceRole: { entities: {
      WorkoutSession: { filter: vi.fn().mockResolvedValue(null) },
      DailyMetrics: { filter: vi.fn().mockResolvedValue([]) },
      AthleteProfile: { update },
    } } };
    expect(await recomputeCTLATLTSB(backend, 'athlete-1'))
      .toMatchObject({ success: false, code: 'INCOMPLETE_HISTORY_READ' });
    expect(update).not.toHaveBeenCalled();
  });
});
