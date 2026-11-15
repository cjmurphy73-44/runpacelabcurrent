import { describe, expect, it } from 'vitest';
import { validateReconciliationPreflight as check } from '../../../base44/shared/reconciliationPreflight';

const plan = { id: 'p1', athlete_id: 'a1', status: 'pending', date: '2026-11-14', sport: 'running', prescribed_duration_minutes: 60 };
const workout = { id: 'w1', athlete_id: 'a1', date: '2026-11-14', sport: 'running', duration_minutes: 60 };
describe('server reconciliation preflight', () => {
  it('only proposes a status without claiming a committed link', () => {
    expect(check('a1', plan, workout, [])).toEqual({ ok: true, reason: 'preflight_only_no_commit', status: 'completed' });
  });
  it('rejects cross-athlete and already-linked records', () => {
    expect(check('a2', plan, workout, []).reason).toBe('scope_mismatch');
    expect(check('a1', plan, { ...workout, training_plan_session_id: 'p2' }, []).reason).toBe('workout_already_linked');
    expect(check('a1', plan, workout, [workout]).reason).toBe('plan_already_linked');
  });
  it('rejects already completed plans and unverified linked queries', () => {
    expect(check('a1', { ...plan, status: 'completed' }, workout, []).reason).toBe('plan_not_pending');
    expect(check('a1', plan, workout, null as any).reason).toBe('linked_query_unverified');
  });
  it('rejects mismatched date, sport and invalid durations', () => {
    expect(check('a1', plan, { ...workout, date: '2026-11-13' }, []).reason).toBe('date_mismatch');
    expect(check('a1', plan, { ...workout, sport: 'cycling' }, []).reason).toBe('sport_mismatch');
    expect(check('a1', plan, { ...workout, duration_minutes: NaN }, []).reason).toBe('duration_unverified');
  });
  it('uses strict 95 and 105 percent duration boundaries', () => {
    expect(check('a1', plan, { ...workout, duration_minutes: 56 }, []).status).toBe('partial');
    expect(check('a1', plan, { ...workout, duration_minutes: 63 }, []).status).toBe('completed');
    expect(check('a1', plan, { ...workout, duration_minutes: 64 }, []).status).toBe('excess');
  });
});
