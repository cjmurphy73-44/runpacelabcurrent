import { describe, expect, it } from 'vitest';
import { workoutMatchingEngine } from '../workoutMatchingEngine';

const actual = { sessionId: 'w1', date: '2026-11-14', sport: 'running', durationMinutes: 60 };
const planned = { id: 'p1', date: '2026-11-14', sport: 'running', targetDurationMinutes: 60 };
describe('read-only planned/actual candidate matching', () => {
  it('returns an exact-duration review suggestion', () => {
    expect(workoutMatchingEngine.matchAll([actual], [planned])).toEqual([
      { sessionId: 'w1', scheduledWorkoutId: 'p1', matchStatus: 'EXACT',
        confidenceScore: 1, varianceDetails: { completionRatio: 1 } },
    ]);
  });
  it('classifies shorter and longer workouts without changing any records', () => {
    const a = { ...actual };
    const p = { ...planned };
    expect(workoutMatchingEngine.matchAll([{ ...actual, durationMinutes: 45 }], [planned])[0].matchStatus).toBe('COMPLETED_SHORT');
    expect(workoutMatchingEngine.matchAll([{ ...actual, durationMinutes: 70 }], [planned])[0].matchStatus).toBe('COMPLETED_EXCEEDED');
    expect(a).toEqual(actual);
    expect(p).toEqual(planned);
  });
  it('does not propose different dates, sports, zero duration or extreme deviations', () => {
    expect(workoutMatchingEngine.matchAll([{ ...actual, sport: 'cycling' }], [planned])).toEqual([]);
    expect(workoutMatchingEngine.matchAll([{ ...actual, date: '2026-11-13' }], [planned])).toEqual([]);
    expect(workoutMatchingEngine.matchAll([{ ...actual, durationMinutes: 0 }], [planned])).toEqual([]);
    expect(workoutMatchingEngine.matchAll([{ ...actual, durationMinutes: 200 }], [planned])).toEqual([]);
  });
  it('keeps ambiguous same-day sessions visible rather than choosing a winner', () => {
    const rows = workoutMatchingEngine.matchAll([actual], [planned, { ...planned, id: 'p2' }]);
    expect(rows.map(r => r.scheduledWorkoutId)).toEqual(['p1', 'p2']);
  });
  it('returns no candidates on invalid collections', () => {
    expect(workoutMatchingEngine.matchAll(null as any, [planned])).toEqual([]);
    expect(workoutMatchingEngine.matchAll([actual], null as any)).toEqual([]);
    expect(workoutMatchingEngine.match(actual, [])).toEqual([]);
  });
});
