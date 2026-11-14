import { describe, expect, it, vi } from 'vitest';
import { VDOT_PRESENTATION_ENABLED, validateVdotPresentationRequest,
  createVdotPresentationBoundary, hasVerifiedVdotOwner } from '../../../base44/shared/vdotPresentationBoundary';
describe('disabled server-owned VDOT presentation boundary', () => {
  it('is disabled by default', () => expect(VDOT_PRESENTATION_ENABLED).toBe(false));
  it('validates finite bounded VDOT and known formats', () => {
    expect(validateVdotPresentationRequest({ kind: 'norwegian', vdot: 52, format: '5x2000' }))
      .toEqual({ kind: 'norwegian', vdot: 52, format: '5x2000' });
    expect(validateVdotPresentationRequest({ kind: 'paces', vdot: 45 })).toEqual({ kind: 'paces', vdot: 45 });
    for (const vdot of [NaN, Infinity, -1, 0, 121, '50']) {
      expect(() => validateVdotPresentationRequest({ kind: 'paces', vdot })).toThrow('invalid_vdot');
    }
    expect(() => validateVdotPresentationRequest({ kind: 'norwegian', vdot: 45, format: 'unknown' }))
      .toThrow('invalid_format');
  });
  it('rejects unknown fields to prevent owner spoofing', () => {
    expect(() => validateVdotPresentationRequest({ kind: 'paces', vdot: 50, athleteId: 'other' }))
      .toThrow('invalid_request');
  });
  it('returns 503 without calling auth or proprietary science', async () => {
    const authenticate = vi.fn();
    const calculate = vi.fn();
    const handler = createVdotPresentationBoundary({ authenticate, calculate });
    expect(await handler({ kind: 'paces', vdot: 50 }, {}))
      .toEqual({ status: 503, body: { error: 'unavailable' } });
    expect(authenticate).not.toHaveBeenCalled();
    expect(calculate).not.toHaveBeenCalled();
  });
  it('rejects missing or unverified owned athlete identity', () => {
    for (const identity of [null, undefined, {}, [], { id: 'user' },
      { id: 'user', athleteId: 'athlete' },
      { id: 'user', athleteId: 'athlete', ownedAthleteVerified: 'true' },
      { id: '', athleteId: 'athlete', ownedAthleteVerified: true },
      { id: 'user', athleteId: ' ', ownedAthleteVerified: true },
    ]) {
      expect(hasVerifiedVdotOwner(identity)).toBe(false);
    }
    expect(hasVerifiedVdotOwner({ id: 'user', athleteId: 'athlete',
      ownedAthleteVerified: true })).toBe(true);
  });
  it('rejects missing dependencies', () => {
    expect(() => createVdotPresentationBoundary({} as never)).toThrow('server_dependencies_required');
  });
});
