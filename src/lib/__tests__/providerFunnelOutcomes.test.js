import { describe, expect, it, vi } from 'vitest';
import { classifyProviderConnection, recordProviderConnectionStatus } from '../providerFunnelOutcomes.js';

describe('verified provider funnel status', () => {
  it('never interprets redirect, unknown or reconnect as verified', () => {
    for (const status of [null, {}, { authorize_url: 'https://example.org' }, { connected: true, needs_reconnect: true }, { connected: true, last_error: 'sync failed' }, { unknown: true }]) {
      expect(classifyProviderConnection(status)).toBe('uncertain');
    }
  });
  it('distinguishes explicit provider connection states', () => {
    expect(classifyProviderConnection({ connected: true })).toBe('verified');
    expect(classifyProviderConnection({ connected: false })).toBe('failed');
    expect(classifyProviderConnection({ connected: 'true' })).toBe('uncertain');
  });
  it('requires affirmative consent and strips server payload', () => {
    const analytics = { track: vi.fn() };
    const params = { analytics, provider: 'coros', status: { connected: true, token: 'secret', athlete_id: 'private' } };
    expect(recordProviderConnectionStatus({ ...params, consent: false })).toBe(false);
    expect(analytics.track).not.toHaveBeenCalled();
    expect(recordProviderConnectionStatus({ ...params, consent: true })).toBe(true);
    expect(analytics.track).toHaveBeenCalledWith({ eventName: 'device_connection_result', properties: { provider: 'coros', outcome: 'verified' } });
  });
  it('rejects unsupported providers and handles analytics exceptions', () => {
    const analytics = { track: vi.fn(() => { throw new Error('offline'); }) };
    expect(recordProviderConnectionStatus({ consent: true, analytics, provider: 'strava', status: { connected: true } })).toBe(false);
    expect(recordProviderConnectionStatus({ consent: true, analytics, provider: 'garmin', status: { connected: false } })).toBe(false);
  });
});
