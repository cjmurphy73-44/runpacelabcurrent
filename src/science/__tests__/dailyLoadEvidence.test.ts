import { describe, expect, it } from 'vitest';
import { assessDailyLoad, auditDailyHistory } from '../../../base44/shared/dailyLoadEvidence';

const workout = (date: string, session_trimp = 45) => ({ date, session_trimp, load_source: 'stream' });

describe('Science 1.3: missing is not zero', () => {
  it('rejects missing days unless rest is explicitly confirmed', () => {
    expect(assessDailyLoad([])).toMatchObject({ eligible: false, load: null, reason: 'unverified_rest_day' });
    expect(assessDailyLoad([], true)).toMatchObject({ eligible: true, load: 0, source: 'confirmed_rest' });
  });

  it('rejects stored zero with no-load provenance, even alongside valid sessions', () => {
    expect(assessDailyLoad([workout('2026-11-13'), { date: '2026-11-13', session_trimp: 0, load_source: 'none' }]))
      .toMatchObject({ eligible: false, load: null, reason: 'unavailable_session_load' });
  });

  it('never combines TRIMP and TSS into a single daily number', () => {
    expect(assessDailyLoad([workout('2026-11-13'), { date: '2026-11-13', session_tss: 80 }]))
      .toMatchObject({ eligible: false, reason: 'mixed_load_units' });
  });

  it('accepts same-unit positive sessions and preserves the units', () => {
    expect(assessDailyLoad([workout('2026-11-13', 40), workout('2026-11-13', 15)]))
      .toMatchObject({ eligible: true, load: 55, unit: 'trimp' });
  });

  it('blocks invalid negative and non-finite loads', () => {
    expect(assessDailyLoad([{ date: '2026-11-13', session_trimp: Number.NaN }]).eligible).toBe(false);
    expect(assessDailyLoad([{ date: '2026-11-13', session_trimp: -1 }]).eligible).toBe(false);
  });

  it('does not infer rest from a gap between recorded workouts', () => {
    expect(auditDailyHistory([workout('2026-11-12'), workout('2026-11-14')], [], '2026-11-14'))
      .toMatchObject({ eligible: false, reason: 'unverified_rest_day', date: '2026-11-13' });
  });

  it('accepts continuous history only when gaps are confirmed rest', () => {
    expect(auditDailyHistory([workout('2026-11-12'), workout('2026-11-14')],
      [{ date: '2026-11-13', confirmed_rest: true }], '2026-11-14'))
      .toMatchObject({ eligible: true, unit: 'trimp' });
  });

  it('rejects a rest confirmation that conflicts with a workout', () => {
    expect(auditDailyHistory([workout('2026-11-14')],
      [{ date: '2026-11-14', confirmed_rest: true }], '2026-11-14'))
      .toMatchObject({ eligible: false, reason: 'rest_conflicts_with_session' });
  });

  it('blocks cross-day mixed units and absent history', () => {
    expect(auditDailyHistory([workout('2026-11-13'), { date: '2026-11-14', session_tss: 60 }],
      [], '2026-11-14')).toMatchObject({ eligible: false, reason: 'mixed_load_units' });
    expect(auditDailyHistory([], [], '2026-11-14')).toMatchObject({ eligible: false, reason: 'no_verified_history' });
  });
});
