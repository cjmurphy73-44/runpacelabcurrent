import { describe, expect, it, vi } from 'vitest';
import { trackConsentedFunnelEvent as track } from '../consentedFunnelTracking.js';

describe('consented onboarding funnel tracking', () => {
  it('does not emit without affirmative consent', () => {
    const analytics = { track: vi.fn() };
    expect(track({ consent: undefined, analytics, name: 'signup_completed', properties: { method: 'unknown' } })).toBe(false);
    expect(track({ consent: false, analytics, name: 'signup_completed', properties: { method: 'unknown' } })).toBe(false);
    expect(analytics.track).not.toHaveBeenCalled();
  });
  it('emits only an allowlisted category when consented', () => {
    const analytics = { track: vi.fn() };
    expect(track({ consent: true, analytics, name: 'signup_completed', properties: { method: 'unknown', athlete_id: 'secret' } })).toBe(true);
    expect(analytics.track).toHaveBeenCalledWith({ eventName: 'signup_completed', properties: { method: 'unknown' } });
  });
  it('rejects fake paid outcomes and survives SDK errors', () => {
    const analytics = { track: vi.fn(() => { throw new Error('offline'); }) };
    expect(track({ consent: true, analytics, name: 'checkout_returned', properties: { outcome: 'paid' } })).toBe(false);
    expect(analytics.track).not.toHaveBeenCalled();
    expect(track({ consent: true, analytics, name: 'signup_completed', properties: { method: 'email' } })).toBe(false);
  });
});
