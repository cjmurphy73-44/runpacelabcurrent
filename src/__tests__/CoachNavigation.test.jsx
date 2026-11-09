import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ auth: {}, athlete: {}, subscription: {} }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('@/hooks/useAthlete', () => ({ useAthlete: () => state.athlete }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => state.subscription }));

import { useCoachAccess } from '@/hooks/useCoachAccess';

describe('Coach navigation', () => {
  beforeEach(() => {
    state.auth = { user: { id: 'synthetic-user', role: 'user' } };
    state.athlete = { athlete: { profile_role: 'athlete' }, loading: false };
    state.subscription = { plan: 'free', isPro: false, loading: false };
  });

  it.each(['free', 'pro', 'unlimited'])('hides roster navigation for the %s athlete plan', (plan) => {
    state.subscription.plan = plan;
    const { result } = renderHook(() => useCoachAccess());
    expect(result.current.showCoachNavigation).toBe(false);
    expect(result.current.canUseCoachWorkspace).toBe(false);
  });

  it('does not add coach navigation to an admin using an athlete plan', () => {
    state.auth.user.role = 'admin';
    const { result } = renderHook(() => useCoachAccess());
    expect(result.current.showCoachNavigation).toBe(false);
    expect(result.current.canUseCoachWorkspace).toBe(true);
  });

  it.each(['coach_pro', 'team'])('shows roster navigation for the %s plan', (plan) => {
    state.subscription.plan = plan;
    const { result } = renderHook(() => useCoachAccess());
    expect(result.current.showCoachNavigation).toBe(true);
    expect(result.current.canUseCoachWorkspace).toBe(true);
  });

  it('does not flash a stale coach link while subscription state is loading', () => {
    Object.assign(state.subscription, { plan: 'coach_pro', loading: true });
    const { result } = renderHook(() => useCoachAccess());
    expect(result.current.showCoachNavigation).toBe(false);
  });
});
