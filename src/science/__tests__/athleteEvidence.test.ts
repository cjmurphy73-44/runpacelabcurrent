import { describe, expect, it } from 'vitest';
import { evidenceAwareAthleteContext } from '../../../base44/shared/athleteEvidence';

const today = '2026-11-28';
const workout = (id: string, date: string, more: Record<string, unknown> = {}) => ({
  id, date, athlete_id: 'athlete-a', sport: 'running',
  duration_minutes: 60, session_trimp: 55, load_source: 'stream', ...more,
});
const recovery = (date: string, hrv: number, resting_hr = 52, sleep_duration_hours = 7.5) =>
  ({ date, hrv, resting_hr, sleep_duration_hours });
function before(days: number) {
  const d = new Date(Date.UTC(2026, 10, 28));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

describe('evidence-aware training and recovery context', () => {
  it('separates calendar days from workout count and never invents rest', () => {
    const got = evidenceAwareAthleteContext([
      workout('a', today), workout('b', today, { duration_minutes: 30 }),
      workout('c', before(8), { duration_minutes: 45 }),
      workout('a', today), // retry must not double count
    ], [], today);
    expect(got).toMatchObject({
      state: 'available',
      session_coverage: { recent_days: 28, days_with_saved_workouts: 2, days_without_saved_workouts: 26 },
      recent_week: { workouts: 2, minutes: 90 },
      previous_week: { workouts: 1, minutes: 45 },
    });
    expect(JSON.stringify(got)).toContain('unobserved, not verified rest days');
  });

  it('keeps TRIMP and TSS separate including stream versus estimated provenance', () => {
    const got = evidenceAwareAthleteContext([
      workout('a', today, { session_trimp: 60, session_tss: 80 }),
      workout('b', today, { sport: 'cycling', session_trimp: null, session_tss: 100, load_source: 'summary' }),
      workout('c', today, { sport: 'swimming', session_trimp: null, session_tss: null, load_source: 'summary' }),
    ], [], today);
    expect(got.load_by_unit).toMatchObject({
      trimp: { sessions: 1, total: 60, stream: 1, estimated: 0 },
      tss: { sessions: 2, total: 180, stream: 1, estimated: 1 },
      unknown: 1,
    });
    expect(got.recorded_sports.cycling).toEqual({ sessions: 1, minutes: 60 });
  });

  it('requires seven prior dated recovery readings and excludes the current reading', () => {
    const baseline = Array.from({ length: 7 }, (_, i) => recovery(before(i + 1), 50));
    const notReady = evidenceAwareAthleteContext([], [
      recovery(today, 80), ...baseline.slice(0, 6),
    ], today);
    expect(notReady.recovery.hrv).toMatchObject({
      state: 'insufficient_personal_baseline', baseline_days: 6,
    });
    const good = evidenceAwareAthleteContext([], [recovery(today, 80), ...baseline], today);
    expect(good.recovery.hrv).toMatchObject({
      state: 'descriptive_only', samples: 7, baseline: 50, value: 80,
      direction: 'above_recent_baseline',
    });
    expect(good.recovery.resting_hr.direction).toBe('within_usual_variation');
  });

  it('does not interpret impossible metrics or data from the future', () => {
    const got = evidenceAwareAthleteContext([
      workout('future', '2026-12-01'),
      workout('old', '2026-10-10'),
      workout('invalid', '2026-11-31'),
    ], [recovery(today, 0), ...Array.from({ length: 8 }, (_, i) => recovery(before(i + 1), 50))], today);
    expect(got.session_coverage.days_with_saved_workouts).toBe(0);
    expect(got.recovery.hrv.state).toBe('missing_recent_measurement');
  });

  it('makes unavailable recovery and truncated history explicit instead of returning fake normality', () => {
    const got = evidenceAwareAthleteContext([workout('a', today)], null, today,
      { historyTruncated: true, recoveryUnavailable: true });
    expect(got.confidence).toBe('incomplete_history');
    expect(got.recovery.hrv.state).toBe('unavailable');
    expect(got.session_coverage.history_truncated).toBe(true);
  });

  it('preserves older and duplicate calendar-day records without ambiguous timezones', () => {
    const got = evidenceAwareAthleteContext([
      workout('a', today, { duration_seconds: 3720, duration_minutes: 1 }),
      workout('b', before(27), { duration_minutes: 40 }),
      workout('c', before(28), { duration_minutes: 40 }),
      workout('d', today, { duration_minutes: -50 }),
    ], [], today);
    expect(got.recent_week.minutes).toBe(62);
    expect(got.session_coverage).toMatchObject({
      days_with_saved_workouts: 2, discarded_incomplete_sessions: 1,
    });
    expect(got.recorded_sports.running.sessions).toBe(2);
  });

  it('refuses invalid reference days instead of guessing', () => {
    expect(evidenceAwareAthleteContext([], [], '2026-02-30')).toMatchObject({
      state: 'unavailable', reason: 'invalid_date_or_history',
    });
  });

  it('never includes menstrual or other sensitive health journal fields', () => {
    const got = evidenceAwareAthleteContext([workout('a', today, {
      period_started: true, pregnancy_status: 'private',
    })], [recovery(today, 55)], today);
    expect(JSON.stringify(got)).not.toContain('period_started');
    expect(JSON.stringify(got)).not.toContain('pregnancy_status');
  });
});
