import { describe, expect, it, vi } from 'vitest';
import { logManualWorkout } from '../../../base44/shared/manualWorkout';
import { recomputeCTLATLTSB } from '../../../base44/shared/ctlRecalc';
import { VALID_WORKOUT_SPORTS } from '../../../base44/shared/workoutSports';
// @ts-ignore Vite expands the glob at test load time.
const schemas = import.meta.glob('../../../base44/entities/WorkoutSession.jsonc', { query: '?raw', import: 'default' });

const payload = {
  athlete_id: 'athlete-1', date: '2026-10-10', duration_minutes: 30,
  distance_km: 2.5, rpe: 4, sport: 'walking',
};

function client() {
  const history: any[] = [];
  return {
    history,
    auth: { me: vi.fn(async () => ({ id: 'user-1', role: 'user' })) },
    entities: {
      AthleteProfile: { get: vi.fn(async () => ({ created_by_id: 'user-1' })) },
      WorkoutSession: {
        create: vi.fn(async value => {
          const workout = { ...value, id: 'workout-1' };
          history.push(workout);
          return workout;
        }),
      },
    },
    asServiceRole: {
      entities: {
        AthleteProfile: {
          get: vi.fn(async () => ({ created_by_id: 'user-1' })),
          update: vi.fn(async () => ({})),
        },
        WorkoutSession: {
          filter: vi.fn(async ({ athlete_id }, _sort?: string, _limit?: number, _skip?: number) =>
            history.filter(row => row.athlete_id === athlete_id)),
        },
        DailyMetrics: {
          filter: vi.fn(async () => []),
          bulkCreate: vi.fn(async () => []),
          bulkUpdate: vi.fn(async (_updates: Record<string, unknown>[]) => []),
        },
      },
    },
  };
}

function request(body = payload) {
  return new Request('https://fixture.test', { method: 'POST', body: JSON.stringify(body) });
}

describe('manual workout release contract', () => {
  it('extends the existing sport schema without removing any legacy values', async () => {
    const schema = await schemas['../../../base44/entities/WorkoutSession.jsonc']();
    if (typeof schema !== "string") throw new Error("WorkoutSession schema is unreadable");
    expect(JSON.parse(schema).properties.sport.enum).toEqual(VALID_WORKOUT_SPORTS);
    expect(VALID_WORKOUT_SPORTS.filter(s => s !== 'walking')).toEqual([
      'running', 'cycling', 'swimming', 'strength', 'triathlon', 'other',
    ]);
  });

  it.each(['walking', 'running'])('saves %s in history before requesting recomputation', async sport => {
    const base44 = client();
    const response = await logManualWorkout(base44, request({ ...payload, sport }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true, training_load_refreshed: true,
      workout_session: { sport, source_format: 'csv', duration_seconds: 1800, session_tss: 72 },
    });
    expect(base44.history).toHaveLength(1);
    expect(base44.asServiceRole.entities.DailyMetrics.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ athlete_id: payload.athlete_id, created_by_id: 'user-1', total_trimp: 72, verified_trimp: 0 }),
    ]);
  });

  it('reports a confirmed save even if recomputation fails', async () => {
    const base44 = client();
    base44.asServiceRole.entities.AthleteProfile.update.mockRejectedValue(new Error('unavailable'));
    const response = await logManualWorkout(base44, request());
    expect(await response.json()).toMatchObject({ success: true, training_load_refreshed: false });
    expect(base44.history).toHaveLength(1);
  });

  it('includes every history page and clears stale load without modifying recovery data', async () => {
    const base44 = client();
    const { WorkoutSession, DailyMetrics } = base44.asServiceRole.entities;
    const sessions = Array.from({ length: 501 }, () => ({
      athlete_id: payload.athlete_id, date: payload.date, session_trimp: 1, load_source: 'stream',
    }));
    WorkoutSession.filter.mockImplementation(async (_query, _sort, limit = sessions.length, skip = 0) =>
      sessions.slice(skip, skip + limit));
    const priorDay = { id: 'recovery-day', date: '2026-10-09', total_trimp: 23, sleep_score: 82 };
    DailyMetrics.filter.mockResolvedValue([priorDay]);

    await recomputeCTLATLTSB(base44, payload.athlete_id);

    expect(DailyMetrics.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ date: payload.date, total_trimp: 501, verified_trimp: 501 }),
    ]);
    const [updates] = DailyMetrics.bulkUpdate.mock.calls[0];
    expect(updates).toEqual([
      expect.objectContaining({ id: priorDay.id, total_trimp: 0, calculated_ctl: 0 }),
    ]);
    expect(updates[0]).not.toHaveProperty('sleep_score');
  });

  it('denies a foreign athlete or an unauthenticated request without writing', async () => {
    const base44 = client();
    base44.entities.AthleteProfile.get.mockResolvedValue({ created_by_id: 'someone-else' });
    expect((await logManualWorkout(base44, request())).status).toBe(403);
    base44.auth.me.mockRejectedValue(new Error('not authenticated'));
    expect((await logManualWorkout(base44, request())).status).toBe(401);
    expect(base44.entities.WorkoutSession.create).not.toHaveBeenCalled();
    expect(base44.asServiceRole.entities.WorkoutSession.filter).not.toHaveBeenCalled();
  });

  it('rejects an invalid date, unknown sport or nonfinite duration before persistence', async () => {
    const base44 = client();
    for (const patch of [{ date: '2026-02-30' }, { sport: 'unknown' }, { duration_minutes: Infinity }]) {
      expect((await logManualWorkout(base44, request({ ...payload, ...patch }))).status).toBe(400);
    }
    expect(base44.history).toHaveLength(0);
  });
});
