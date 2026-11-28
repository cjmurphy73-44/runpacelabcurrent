import { describe, expect, it } from 'vitest';
import { compareMatchedEffort } from '../../../base44/shared/efficiencyComparisons';

const reference = '2026-11-28';
function dateAgo(n: number) {
  return new Date(Date.UTC(2026, 10, 28) - n * 86_400_000).toISOString().slice(0,10);
}
const run = (id: string, age: number, distance: number, extras: Record<string, unknown> = {}) => ({
  id, date: dateAgo(age), sport: 'running', duration_minutes: 30,
  distance_km: distance, avg_hr: 150, load_source: 'stream', ...extras,
});
const ride = (id: string, age: number, power: number, extras: Record<string, unknown> = {}) => ({
  id, date: dateAgo(age), sport: 'cycling', duration_minutes: 60,
  avg_power: power, avg_hr: 140, load_source: 'stream', ...extras,
});

describe('matched-effort descriptive comparisons', () => {
  it('compares within-athlete running speed at similar recorded HR and duration', () => {
    const rows = [
      run('old-a', 50, 6), run('old-b', 45, 6), run('old-c', 32, 6),
      run('new-a', 20, 6.3), run('new-b', 15, 6.3), run('new-c', 5, 6.3),
    ];
    const got = compareMatchedEffort(rows, reference, 'running');
    expect(got).toMatchObject({
      state: 'descriptive_only', metric: 'average_speed_mps',
      relative_change_percent: 5,
      older: { sessions: 3 }, recent: { sessions: 3 },
    });
  });

  it('uses power instead of outdoor speed for cycling', () => {
    const got = compareMatchedEffort([
      ride('a', 56, 200), ride('b', 42, 200), ride('c', 28, 200),
      ride('d', 21, 210), ride('e', 14, 210), ride('f', 0, 210),
    ], reference, 'cycling');
    expect(got).toMatchObject({ state: 'descriptive_only',
      metric: 'average_power_watts', relative_change_percent: 5 });
  });

  it('requires three distinct observation dates in each window, not clustered workouts', () => {
    const rows = [
      run('old-a', 40, 6), run('old-b', 40, 6), run('old-c', 40, 6),
      run('new-a', 10, 6.4), run('new-b', 10, 6.4), run('new-c', 10, 6.4),
    ];
    expect(compareMatchedEffort(rows, reference, 'running')).toMatchObject({
      state: 'insufficient_comparable_sessions',
      older_candidates: 3, recent_candidates: 3,
      older_distinct_days: 1, recent_distinct_days: 1,
      required_distinct_days_per_window: 3,
    });
  });

  it('reports independent dates when repeatable trends have sufficient evidence', () => {
    const rows = [
      run('old-a', 50, 6), run('old-b', 45, 6), run('old-c', 32, 6),
      run('new-a', 20, 6.3), run('new-b', 15, 6.3), run('new-c', 5, 6.3),
    ];
    expect(compareMatchedEffort(rows, reference, 'running')).toMatchObject({
      state: 'descriptive_only',
      older: { sessions: 3, distinct_days: 3 },
      recent: { sessions: 3, distinct_days: 3 },
      relative_change_percent: 5,
    });
  });

  it('requires separately observed earlier and later sessions', () => {
    expect(compareMatchedEffort([run('a', 40, 6), run('b', 5, 6)], reference, 'running'))
      .toMatchObject({ state: 'insufficient_comparable_sessions', required_per_window: 3 });
  });

  it('excludes summary-only sessions and duplicated provider retries', () => {
    const got = compareMatchedEffort([
      run('a', 56, 6), run('a', 56, 6), run('b', 48, 6), run('c', 29, 6),
      run('d', 21, 6.5), run('e', 10, 6.5), run('f', 3, 6.5, { load_source: 'summary' }),
    ], reference, 'running');
    expect(got.state).toBe('insufficient_comparable_sessions');
  });

  it('refuses to compare unmatched heart-rate or duration groups', () => {
    const got = compareMatchedEffort([
      run('a', 45, 6), run('b', 44, 6), run('c', 43, 6),
      run('d', 15, 6.3, { avg_hr: 175 }),
      run('e', 13, 6.3, { avg_hr: 175 }),
      run('f', 10, 6.3, { duration_minutes: 100 }),
    ], reference, 'running');
    expect(got).toMatchObject({
      state: 'insufficient_comparable_sessions',
      recent_candidates: 0,
    });
  });

  it.each(['swimming','rowing','triathlon','mountain_biking','strength','yoga','e_bike'])
    ('does not invent comparable physiology for %s', sport => {
    expect(compareMatchedEffort([], reference, sport))
      .toMatchObject({ state: 'not_comparable', sport });
  });

  it('does not use future, impossible, invalid or missing sensor values', () => {
    const got = compareMatchedEffort([
      run('a', -2, 8), run('b', 40, 6, { avg_hr: null }),
      run('c', 41, 60), run('d', 42, 6, { duration_minutes: 1 }),
    ], reference, 'running');
    expect(got.state).toBe('insufficient_comparable_sessions');
    expect(compareMatchedEffort([], '2026-02-30', 'running'))
      .toMatchObject({ state: 'unavailable' });
  });

  it('does not pass sensitive health fields into the comparison response', () => {
    const sensitive = run('a', 40, 6, { menstrual_cycle: 'private', diagnosis: 'private' });
    const got = compareMatchedEffort([sensitive], reference, 'running');
    expect(JSON.stringify(got)).not.toMatch(/menstrual_cycle|diagnosis/);
  });
});
