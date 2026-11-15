import { describe, expect, it } from 'vitest';
import { canConfirmUniqueMatch } from '../uniqueWorkoutMatch';

const a = { sessionId: 'workout-a', scheduledWorkoutId: 'plan-a', matchStatus: 'EXACT' };
describe('explicit planned/actual workout confirmation', () => {
  it('allows a single unambiguous candidate to be reviewed and confirmed', () => {
    expect(canConfirmUniqueMatch(a, [a])).toBe(true);
  });
  it('blocks one recorded workout being assigned to two scheduled sessions', () => {
    expect(canConfirmUniqueMatch(a, [a, { sessionId: 'workout-a', scheduledWorkoutId: 'plan-b' }])).toBe(false);
  });
  it('blocks two recorded workouts being assigned to the same scheduled session', () => {
    expect(canConfirmUniqueMatch(a, [a, { sessionId: 'workout-b', scheduledWorkoutId: 'plan-a' }])).toBe(false);
  });
  it('rejects stale candidates not present in the current review list', () => {
    expect(canConfirmUniqueMatch({ ...a }, [a])).toBe(false);
  });
  it('rejects invalid or missing identifiers', () => {
    expect(canConfirmUniqueMatch(null, [a])).toBe(false);
    expect(canConfirmUniqueMatch({ sessionId: 'workout-a' }, [])).toBe(false);
  });
});
