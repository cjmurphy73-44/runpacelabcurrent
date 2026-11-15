import { describe, expect, it } from 'vitest';
import { FUNNEL_EVENT_NAMES, makeFunnelEvent } from '../funnelEvents.js';

describe('privacy-minimal funnel events', () => {
  it('retains only approved categorical fields', () => {
    const event = makeFunnelEvent('device_connection_result', {
      provider: 'coros', outcome: 'uncertain', athlete_id: 'private-id',
      email: 'private@example.com', heart_rate: 170, token: 'secret',
    });
    expect({ ...event.properties }).toEqual({ provider: 'coros', outcome: 'uncertain' });
    expect(JSON.stringify(event)).not.toMatch(/private|secret|170/);
  });
  it('does not confuse checkout redirect with payment success', () => {
    expect(makeFunnelEvent('checkout_returned', { outcome: 'paid' })).toBeNull();
    expect(makeFunnelEvent('checkout_returned', { outcome: 'returned' })?.name).toBe('checkout_returned');
    expect(FUNNEL_EVENT_NAMES).not.toContain('payment_confirmed');
  });
  it('rejects arbitrary events, invalid enums and missing required categories', () => {
    expect(makeFunnelEvent('athlete_record', { value: 'x' })).toBeNull();
    expect(makeFunnelEvent('first_session_result', { provenance: 'guessed' })).toBeNull();
    expect(makeFunnelEvent('device_connection_result', { provider: 'garmin' })).toBeNull();
    expect(makeFunnelEvent('__proto__', {})).toBeNull();
  });
  it('does not mutate caller input or include extra metadata', () => {
    const properties = Object.freeze({ surface: 'landing', url: '/?token=secret' });
    expect({ ...makeFunnelEvent('landing_viewed', properties).properties }).toEqual({ surface: 'landing' });
  });
  it('rejects non-object property payloads', () => {
    expect(makeFunnelEvent('landing_viewed', null)).toBeNull();
    expect(makeFunnelEvent('landing_viewed', ['landing'])).toBeNull();
  });
});
