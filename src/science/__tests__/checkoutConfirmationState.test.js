import { describe, it, expect } from 'vitest';
import { checkoutConfirmationState as state } from '../../lib/checkoutConfirmationState';
const base = { authenticated: true, loading: false, refreshFailed: false, plan: 'pro', status: 'active', requestedPlan: 'pro' };
describe('checkout return entitlement copy', () => {
  it('confirms only matching authenticated server entitlement', () => expect(state(base)).toBe('active'));
  it('does not confirm direct URL access while signed out', () => expect(state({ ...base, authenticated: false })).toBe('sign_in'));
  it('does not confirm while refresh is loading or failed', () => {
    expect(state({ ...base, loading: true })).toBe('pending');
    expect(state({ ...base, refreshFailed: true })).toBe('pending');
  });
  it('does not confirm free, wrong or absent plans', () => {
    for (const plan of ['free', 'coach_pro', '', undefined]) expect(state({ ...base, plan })).toBe('pending');
  });
  it('does not confirm failed, pending or canceled subscriptions', () => {
    for (const status of ['canceled', 'unpaid', 'past_due', 'incomplete']) expect(state({ ...base, status })).toBe('not_active');
    expect(state({ ...base, status: 'pending' })).toBe('pending');
  });
});
