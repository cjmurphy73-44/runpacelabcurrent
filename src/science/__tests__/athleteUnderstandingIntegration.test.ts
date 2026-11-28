import { describe, expect, it, vi } from 'vitest';
import { buildCombinedAthleteUnderstanding, handleAthleteUnderstanding }
  from '../../../base44/shared/athleteUnderstanding';

const day = '2026-11-28';
const run = (id: string, date = day, more: Record<string, unknown> = {}) => ({
  id, athlete_id: 'athlete-1', date, sport: 'running', duration_minutes: 40,
  session_trimp: 65, load_source: 'stream', avg_hr: 145, distance_km: 8, ...more,
});
function fixture(options: {
  authenticated?: boolean; owned?: boolean; workouts?: any[]; recovery?: any[];
  foreignWorkout?: boolean; queryError?: boolean;
} = {}) {
  const profile = { id: 'athlete-1', created_by_id: options.owned === false ? 'other-user' : 'user-1' };
  const workoutFilter = vi.fn(async () => {
    if (options.queryError) throw new Error('Storage offline');
    if (options.foreignWorkout) return [run('foreign', day, { athlete_id: 'athlete-2', notes: 'secret' })];
    return options.workouts ?? [run('w-1')];
  });
  const recoveryFilter = vi.fn(async () => options.recovery ?? []);
  const other = vi.fn(async () => { throw new Error('Sensitive journal access forbidden'); });
  const base44 = {
    auth: { me: vi.fn(async () => options.authenticated === false ? null : { id: 'user-1' }) },
    asServiceRole: { entities: {
      User: { get: vi.fn(async () => ({ id: 'user-1', data: {} })) },
      AthleteProfile: {
        get: vi.fn(async () => profile), filter: vi.fn(async () => [profile]),
      },
      WorkoutSession: { filter: workoutFilter },
      DailyMetrics: { filter: recoveryFilter },
      AthleteHealthConsent: { filter: other },
      AthleteHealthJournal: { filter: other },
    } },
  };
  return { base44, workoutFilter, recoveryFilter, other };
}
const request = (method = 'POST') => new Request('https://example.test/athleteUnderstanding', { method });

describe('combined athlete intelligence API', () => {
  it('separates measured load units and uses a read-only descriptive evidence response', () => {
    const result = buildCombinedAthleteUnderstanding([
      run('run', day, { session_trimp: 40, session_tss: 55 }),
      { ...run('ride', day, { sport: 'cycling', session_trimp: null, session_tss: 100 }) },
    ], [], day);
    expect(result).toMatchObject({
      state: 'observational_only', time_basis: 'UTC_calendar_day',
      privacy: { journal_included: false, coach_access_to_journal: false },
      history: { load_by_unit: {
        trimp: { total: 40 }, tss: { total: 155 },
      } },
    });
    expect(result).toHaveProperty('calendar_load_response');
    expect(result).toHaveProperty('matched_efforts.running');
  });

  it('returns no made-up readiness when history is empty', () => {
    const result = buildCombinedAthleteUnderstanding([], [], day);
    expect(result).toMatchObject({ state: 'observational_only',
      history: { confidence: 'no_recent_workouts', recovery: {
        hrv: { state: 'missing_recent_measurement' },
      } },
      matched_efforts: { running: { state: 'insufficient_comparable_sessions' } },
    });
    expect(JSON.stringify(result)).not.toContain('injury_probability');
  });

  it('rejects anonymous requests and unsupported HTTP methods before reading records', async () => {
    const { base44, workoutFilter } = fixture({ authenticated: false });
    expect((await handleAthleteUnderstanding(base44, request())).status).toBe(401);
    expect((await handleAthleteUnderstanding(base44, request('GET'))).status).toBe(405);
    expect(workoutFilter).not.toHaveBeenCalled();
  });

  it('rejects foreign athlete ownership before querying training history', async () => {
    const { base44, workoutFilter } = fixture({ owned: false });
    const result = await handleAthleteUnderstanding(base44, request());
    expect(result.status).toBe(404);
    expect(workoutFilter).not.toHaveBeenCalled();
  });

  it('fails closed if data reads return a foreign row or throw', async () => {
    for (const opts of [{ foreignWorkout: true }, { queryError: true }]) {
      const { base44 } = fixture(opts);
      const response = await handleAthleteUnderstanding(base44, request());
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ state: 'unavailable' });
    }
  });

  it('never reads or exposes the private menstrual journal', async () => {
    const { base44, other } = fixture({
      workouts: [run('a', day, { period_started: true, private_notes: 'sensitive' })],
    });
    const response = await handleAthleteUnderstanding(base44, request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const payload = await response.json();
    expect(payload.state).toBe('observational_only');
    expect(JSON.stringify(payload)).not.toMatch(/period_started|private_notes|sensitive/);
    expect(other).not.toHaveBeenCalled();
  });

  it('leaves current workout and recovery entity records unchanged', async () => {
    const { base44, workoutFilter, recoveryFilter } = fixture();
    expect((await handleAthleteUnderstanding(base44, request())).status).toBe(200);
    expect(workoutFilter).toHaveBeenCalledOnce();
    expect(recoveryFilter).toHaveBeenCalledOnce();
    expect(base44.asServiceRole.entities.WorkoutSession).not.toHaveProperty('update');
  });
});
