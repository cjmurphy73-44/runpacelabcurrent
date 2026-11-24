import { describe, expect, it, vi } from 'vitest';
import { logManualWorkout } from '../../../base44/shared/manualWorkout';
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
    functions: {
      invoke: vi.fn(async (_name: string, args: any) => {
        expect(history[0].athlete_id).toBe(args.athlete_id);
        return { data: { success: true } };
      }),
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
    expect(base44.functions.invoke).toHaveBeenCalledWith('recalculateCTLATLTSB', { athlete_id: payload.athlete_id });
  });

  it('reports a confirmed save even if recomputation fails', async () => {
    const base44 = client();
    base44.functions.invoke.mockRejectedValue(new Error('unavailable'));
    const response = await logManualWorkout(base44, request());
    expect(await response.json()).toMatchObject({ success: true, training_load_refreshed: false });
    expect(base44.history).toHaveLength(1);
  });

  it('denies a foreign athlete or an unauthenticated request without writing', async () => {
    const base44 = client();
    base44.entities.AthleteProfile.get.mockResolvedValue({ created_by_id: 'someone-else' });
    expect((await logManualWorkout(base44, request())).status).toBe(403);
    base44.auth.me.mockRejectedValue(new Error('not authenticated'));
    expect((await logManualWorkout(base44, request())).status).toBe(401);
    expect(base44.entities.WorkoutSession.create).not.toHaveBeenCalled();
    expect(base44.functions.invoke).not.toHaveBeenCalled();
  });

  it('rejects an invalid date, unknown sport or nonfinite duration before persistence', async () => {
    const base44 = client();
    for (const patch of [{ date: '2026-02-30' }, { sport: 'unknown' }, { duration_minutes: Infinity }]) {
      expect((await logManualWorkout(base44, request({ ...payload, ...patch }))).status).toBe(400);
    }
    expect(base44.history).toHaveLength(0);
  });
});
