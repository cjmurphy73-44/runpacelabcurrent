import { describe, expect, it } from 'vitest';
import { createVdotPresentationRequestKey, settleVdotPresentation,
  unavailableVdotPresentation, VDOT_CLIENT_PRESENTATION_ENABLED } from '../../lib/vdotPresentationClient';

describe('future VDOT client presentation boundary remains fail closed', () => {
  it('never exposes a ready state when the endpoint is disabled', () => {
    expect(VDOT_CLIENT_PRESENTATION_ENABLED).toBe(false);
    expect(unavailableVdotPresentation()).toEqual({ status: 'unavailable', reason: 'not_enabled' });
    expect(settleVdotPresentation(
      { status: 'loading', requestKey: 'a' }, 'a', { ok: true, value: { secret: 'unverified' } },
    )).toEqual({ status: 'unavailable', reason: 'not_enabled' });
  });
  it('rejects invented, nonfinite and out-of-range VDOT inputs', () => {
    for (const value of [NaN, Infinity, -Infinity, 0, -1, 121]) {
      expect(createVdotPresentationRequestKey('paces', value)).toBeNull();
    }
  });
  it('generates distinct correlation keys for distinct prescriptions', () => {
    expect(createVdotPresentationRequestKey('norwegian', 50, '10x1000'))
      .not.toBe(createVdotPresentationRequestKey('norwegian', 50, '5x2000'));
    expect(createVdotPresentationRequestKey('norwegian', 50, '1000m')).toBeNull();
    expect(createVdotPresentationRequestKey('paces', 50, '10x1000')).toBeNull();
  });
  it('does not accept stale results or fabricate fallback pace values', () => {
    const previous = { status: 'loading' as const, requestKey: 'new' };
    expect(settleVdotPresentation(previous, 'old', { ok: true, value: { secPerKm: 123 } }))
      .toEqual({ status: 'unavailable', reason: 'not_enabled' });
    expect(Object.keys(unavailableVdotPresentation())).not.toContain('paces');
  });
});
