import { describe, expect, it, vi } from 'vitest';
import { handleAthleteUnderstanding, summarizeAthleteUnderstanding } from '../../../base44/shared/athleteUnderstanding';

const today = '2026-11-28';
function workout(id: string, date = today, extra: Record<string, unknown> = {}) {
  return { id, athlete_id: 'athlete-1', date, duration_minutes: 30, sport: 'running', load_source: 'stream', session_trimp: 24, ...extra };
}
function fixture({ authenticated = true, owned = true, history = [workout('w-1')], recovery = [] as any[] } = {}) {
  const profile = { id: 'athlete-1', created_by_id: owned ? 'user-1' : 'user-2' };
  const workFilter = vi.fn(async (_query: any, _sort: string, limit = 250, skip = 0) => history.slice(skip, skip + limit));
  const recoveryFilter = vi.fn(async (_query: any, _sort: string, limit = 250, skip = 0) => recovery.slice(skip, skip + limit));
  const base44 = {
    auth: { me: vi.fn(async () => authenticated ? { id: 'user-1' } : null) },
    asServiceRole: { entities: {
      User: { get: vi.fn(async () => ({ id: 'user-1', data: {} })) },
      AthleteProfile: { get: vi.fn(async () => profile), filter: vi.fn(async () => [profile]) },
      WorkoutSession: { filter: workFilter },
      DailyMetrics: { filter: recoveryFilter },
    } },
  };
  return { base44, workFilter, recoveryFilter };
}
const request = () => new Request('https://fixture.test/athleteUnderstanding', { method: 'POST' });

describe('private deterministic athlete understanding', () => {
  it('returns explicit insufficient evidence, not fabricated readiness', () => {
    const got = summarizeAthleteUnderstanding([], [], today);
    expect(got).toMatchObject({ state: 'available', workout_count: 0,
      recovery_evidence: { days_with_measurements: 0, readiness_from_recovery: 'insufficient_recovery_data' } });
    expect(got.context).toContain('No recent saved workouts; reconnect or import training to populate this view.');
  });

  it('deduplicates workout identities, compares real periods and keeps data quality separate', () => {
    const got = summarizeAthleteUnderstanding([
      workout('w-1'), workout('w-1'), workout('w-2', '2026-11-25', { duration_minutes: 45, load_source: 'summary', session_trimp: 20 }),
      workout('w-3', '2026-11-20', { duration_minutes: 65 }),
    ], [{ date: today, sleep_score: 70 }], today);
    expect(got).toMatchObject({
      workout_count: 2, minutes: 75, prior_week: { workouts: 1, minutes: 65 },
      source_quality: { full_stream: 1, summary: 1, unclassified: 0 },
      recovery_evidence: { days_with_measurements: 1, readiness_from_recovery: 'signals_available' },
    });
    expect(got.training_load).toMatchObject({ known_sessions: 2, missing_sessions: 0 });
    expect(JSON.stringify(got)).not.toContain('period_started');
  });

  it('rejects anonymous or foreign owners before querying history', async () => {
    const anonymous = fixture({ authenticated: false });
    expect((await handleAthleteUnderstanding(anonymous.base44, request())).status).toBe(401);
    expect(anonymous.workFilter).not.toHaveBeenCalled();
    const foreign = fixture({ owned: false });
    expect((await handleAthleteUnderstanding(foreign.base44, request())).status).toBe(404);
    expect(foreign.recoveryFilter).not.toHaveBeenCalled();
  });

  it('never includes menstrual journal data or triggers an AI or data write', async () => {
    const { base44 } = fixture();
    const response = await handleAthleteUnderstanding(base44, request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('workout_count');
    expect(JSON.stringify(body)).not.toContain('AthleteHealthJournal');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('fails closed if a scoped query includes a foreign athlete row', async () => {
    const { base44 } = fixture({ history: [workout('foreign', today, { athlete_id: 'athlete-2' })] });
    expect((await handleAthleteUnderstanding(base44, request())).status).toBe(503);
  });
});
