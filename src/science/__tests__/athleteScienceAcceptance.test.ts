import { describe, expect, it } from 'vitest';
import { buildCombinedAthleteUnderstanding } from '../../../base44/shared/athleteUnderstanding';
import { modelCalendarLoad } from '../../../base44/shared/calendarAdaptation';

const today = '2026-11-28';
function dateBefore(days: number) {
  return new Date(Date.UTC(2026, 10, 28) - days * 86400000).toISOString().slice(0, 10);
}
function workout(id: string, age: number, sport: string, more: Record<string, unknown> = {}) {
  return {
    id, athlete_id: 'athlete-test', date: dateBefore(age), sport, duration_minutes: 40,
    avg_hr: 145, distance_km: 8, load_source: 'stream', session_trimp: 60, ...more,
  };
}

describe('multi-sport athlete science golden acceptance fixtures', () => {
  it('compares like-for-like running and cycling over repeated dates without inventing swim comparability', () => {
    const rows = [
      ...[50, 44, 33].map((age, i) => workout('run-old-' + i, age, 'running')),
      ...[20, 12, 3].map((age, i) => workout('run-new-' + i, age, 'running',
        { distance_km: 8.4 })),
      ...[51, 42, 34].map((age, i) => workout('bike-old-' + i, age, 'cycling',
        { session_trimp: null, session_tss: 70, avg_power: 160 })),
      ...[19, 11, 2].map((age, i) => workout('bike-new-' + i, age, 'cycling',
        { session_trimp: null, session_tss: 76, avg_power: 168 })),
      ...[48, 15, 7].map((age, i) => workout('swim-' + i, age, 'swimming',
        { session_trimp: null, session_tss: 35, avg_hr: null, distance_km: 1.5 })),
    ];
    const recovery = Array.from({ length: 9 }, (_, i) => ({
      athlete_id: 'athlete-test', date: dateBefore(i), hrv: i === 0 ? 55 : 50,
      resting_hr: 53, sleep_duration_hours: 7.5,
    }));
    const result = buildCombinedAthleteUnderstanding(rows, recovery, today);
    expect(result).toMatchObject({
      state: 'observational_only', history: {
        load_by_unit: { trimp: { sessions: 6 }, tss: { sessions: 9 } },
      },
      matched_efforts: {
        running: { state: 'descriptive_only', relative_change_percent: 5,
          older: { distinct_days: 3 }, recent: { distinct_days: 3 } },
        cycling: { state: 'descriptive_only', relative_change_percent: 5,
          older: { distinct_days: 3 }, recent: { distinct_days: 3 } },
      },
    });
    expect(result.history.recovery.hrv).toMatchObject({
      state: 'descriptive_only', samples: 8, value: 55, baseline: 50,
    });
    const models = result.calendar_load_response.sport_load_models;
    expect(models.map((model: any) => [model.sport, model.unit])).toEqual([
      ['cycling', 'tss'], ['running', 'trimp'], ['swimming', 'tss'],
    ]);
    expect(models.every((model: any) => model.data_status === 'partial_observation_window')).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/injury_probability|period_started|ovulation/);
  });

  it('modelled daily decay agrees with its independently calculated exponential recurrence', () => {
    const rows = [workout('run', 0, 'running', { session_trimp: 100 })];
    const result = modelCalendarLoad(rows, today, { sport: 'running', unit: 'trimp', days: 84 });
    expect(result.status).toBe('available');
    if (result.status !== 'available') return;
    const alphaCtl = 1 - Math.exp(-1 / 42);
    const alphaAtl = 1 - Math.exp(-1 / 7);
    expect(result.timeline.at(-1)).toMatchObject({
      recorded_load: 100,
      model_ctl: Number((100 * alphaCtl).toFixed(2)),
      model_atl: Number((100 * alphaAtl).toFixed(2)),
      day_evidence: 'recorded_workout',
    });
    expect(result.latest).toMatchObject({ ctl: null, atl: null, tsb: null });
    expect(result.completeness).toMatchObject({
      saved_workout_days: 1, unobserved_days: 83,
    });
  });

  it('does not calculate improvements from summary-only imports or sensor gaps', () => {
    const rows = [
      ...[50, 40, 30].map((age, i) => workout('old-' + i, age, 'running',
        { load_source: 'summary' })),
      ...[20, 10, 1].map((age, i) => workout('new-' + i, age, 'running',
        { load_source: 'summary', distance_km: 12 })),
    ];
    const result = buildCombinedAthleteUnderstanding(rows, [], today);
    expect(result.matched_efforts.running.state).toBe('insufficient_comparable_sessions');
    expect(result.history.recovery.hrv.state).toBe('missing_recent_measurement');
    expect(result.calendar_load_response.sport_load_models[0].data_status)
      .toBe('partial_observation_window');
  });

  it('duplicate provider identities cannot inflate reported load or independent dates', () => {
    const row = workout('same-id', 0, 'running');
    const result = buildCombinedAthleteUnderstanding([row, { ...row }], [], today);
    expect(result.history.recent_week).toMatchObject({ workouts: 1, minutes: 40 });
    expect(result.history.load_by_unit.trimp).toMatchObject({ sessions: 1, total: 60 });
    expect(result.matched_efforts.running.state).toBe('insufficient_comparable_sessions');
  });
});
