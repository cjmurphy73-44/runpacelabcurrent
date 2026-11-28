import { describe, expect, it } from 'vitest';
import { modelCalendarLoad, summarizeCalendarResponse } from '../../../base44/shared/calendarAdaptation';

const reference = '2026-11-28';
function offset(daysAgo: number) {
  return new Date(Date.UTC(2026, 10, 28) - daysAgo * 86_400_000).toISOString().slice(0, 10);
}
const session = (id: string, daysAgo: number, sport: string, data: Record<string, unknown> = {}) =>
  ({ id, date: offset(daysAgo), sport, session_trimp: 55, load_source: 'stream', ...data });

describe('calendar-correct observational adaptation', () => {
  it('models 84 consecutive calendar days even when only two workouts exist', () => {
    const got = modelCalendarLoad([
      session('old', 50, 'running'), session('new', 1, 'running'),
    ], reference, { unit: 'trimp', sport: 'running' });
    expect(got.status).toBe('available');
    if (got.status !== 'available') return;
    expect(got.timeline).toHaveLength(84);
    expect(got.completeness).toMatchObject({
      saved_workout_days: 2, unobserved_days: 82, included_sessions: 2,
    });
    expect(got.timeline.find(d => d.date === offset(49))?.day_evidence).toBe('unobserved');
    expect(got.data_status).toBe('partial_observation_window');
    expect(got.model_status).toBe('illustrative_model');
    expect(got.latest.ctl).not.toBeNull();
  });

  it('decays on calendar gaps rather than advancing only when there was a workout', () => {
    const got = modelCalendarLoad([
      session('one', 40, 'running', { session_trimp: 110 }),
    ], reference, { unit: 'trimp' });
    expect(got.status).toBe('available');
    if (got.status !== 'available') return;
    const first = got.timeline.find(d => d.date === offset(40));
    const after = got.timeline.find(d => d.date === offset(39));
    expect(first).toBeDefined();
    expect(after).toBeDefined();
    expect(after!.model_ctl).toBeLessThan(first!.model_ctl);
    expect(after!.model_atl).toBeLessThan(first!.model_atl);
  });

  it('keeps cycling TSS separate from running TRIMP, preserving all 23 sport identities', () => {
    const got = summarizeCalendarResponse([
      session('run', 2, 'running', { session_tss: null }),
      session('bike', 3, 'cycling', { session_trimp: null, session_tss: 110 }),
      session('swim', 4, 'swimming', { session_trimp: 20, session_tss: 30 }),
    ], reference);
    expect(got.state).toBe('observational_only');
    expect(got.model_count).toBe(4);
    expect(got.sport_load_models.map(m => [m.sport, m.unit])).toEqual([
      ['cycling', 'tss'], ['running', 'trimp'], ['swimming', 'trimp'], ['swimming', 'tss'],
    ]);
  });

  it('deduplicates source IDs even when the retry carries the same session', () => {
    const got = modelCalendarLoad([session('same', 0, 'cycling'), session('same', 0, 'cycling')],
      reference, { unit: 'trimp', sport: 'cycling' });
    expect(got.status).toBe('available');
    if (got.status !== 'available') return;
    expect(got.completeness.included_sessions).toBe(1);
    expect(got.timeline.at(-1)?.recorded_load).toBe(55);
  });

  it('labels user-confirmed rest but never converts every blank day into rest', () => {
    const got = modelCalendarLoad([session('run', 1, 'running')], reference,
      { unit: 'trimp', sport: 'running', confirmedRestDates: [offset(2), offset(2), '2026-02-30'] });
    expect(got.status).toBe('available');
    if (got.status !== 'available') return;
    expect(got.completeness.athlete_confirmed_rest_days).toBe(1);
    expect(got.completeness.unobserved_days).toBe(82);
    expect(got.timeline.find(d => d.date === offset(2))?.day_evidence).toBe('athlete_confirmed_rest');
  });

  it('never treats populated history as proof of complete provider coverage', () => {
    const got = modelCalendarLoad([session('run', 1, 'running')], reference, {
      unit: 'trimp', sport: 'running', verifiedCoverageStart: offset(40),
    });
    expect(got.status).toBe('available');
    if (got.status !== 'available') return;
    expect(got.data_status).toBe('partial_observation_window');
    const confirmed = modelCalendarLoad([session('run', 1, 'running')], reference, {
      unit: 'trimp', sport: 'running', verifiedCoverageStart: offset(100),
    });
    expect(confirmed.status).toBe('available');
    if (confirmed.status === 'available') expect(confirmed.data_status).toBe('complete_connector_window');
  });

  it('explicitly downgrades truncated history even when a verified date was supplied', () => {
    const got = modelCalendarLoad([session('run', 1, 'running')], reference, {
      unit: 'trimp', historyTruncated: true, verifiedCoverageStart: offset(100),
    });
    expect(got.status).toBe('available');
    if (got.status === 'available') {
      expect(got.data_status).toBe('partial_observation_window');
      expect(got.completeness.history_truncated).toBe(true);
    }
  });

  it('returns insufficient or unavailable instead of a confident model with short history', () => {
    const got = modelCalendarLoad([session('run', 1, 'running')], reference,
      { unit: 'trimp', days: 14 });
    expect(got.status).toBe('available');
    if (got.status === 'available') {
      expect(got.model_status).toBe('insufficient_window');
      expect(got.latest.ctl).toBeNull();
    }
    expect(modelCalendarLoad([], '2026-02-30', { unit: 'trimp' })).toEqual({
      status: 'unavailable', reason: 'invalid_input',
    });
  });

  it('does not produce false injury probabilities or sensitive reproductive context', () => {
    const got = summarizeCalendarResponse([{
      ...session('run', 1, 'running'), period_started: true, pregnancy_status: 'private',
    }], reference);
    expect(JSON.stringify(got)).not.toContain('period_started');
    expect(JSON.stringify(got)).not.toContain('pregnancy_status');
    expect(JSON.stringify(got)).not.toContain('injury_probability');
    expect(got.limits).toMatch(/not observed fitness/);
  });
});
