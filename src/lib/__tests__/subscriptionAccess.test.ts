import { describe, expect, it } from 'vitest';
import { assertPaidPlan, isSubscriptionActive } from '../../../base44/shared/planGate';
import { getSyncLookbackDays } from '../../../base44/shared/syncLookback';

describe('subscription access', () => {
  it('honors the period boundary while preserving subscriptions without an expiry', () => {
    const now = Date.parse('2026-11-24T00:00:00Z');
    expect(isSubscriptionActive({ status: 'active' }, now)).toBe(true);
    expect(isSubscriptionActive({ status: 'trialing', current_period_end: '2026-11-25T00:00:00Z' }, now)).toBe(true);
    expect(isSubscriptionActive({ status: 'active', current_period_end: '2026-11-24T00:00:00Z' }, now)).toBe(false);
    expect(isSubscriptionActive({ status: 'active', current_period_end: 'invalid' }, now)).toBe(false);
    expect(isSubscriptionActive({ status: 'canceled', current_period_end: '2026-11-25T00:00:00Z' }, now)).toBe(false);
  });

  it('removes paid features and extended device sync from an expired access code', async () => {
    const subscription = { plan: 'pro', status: 'active', current_period_end: '2020-01-01T00:00:00Z' };
    const base44 = { asServiceRole: { entities: { Subscription: { filter: async () => [subscription] } } } };
    await expect(assertPaidPlan(base44, { id: 'athlete', role: 'user' })).resolves.toEqual({ ok: false, plan: 'free' });
    await expect(getSyncLookbackDays(base44, 'athlete')).resolves.toBe(90);
  });
});
