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
    const verifyOwnedAthlete = vi.fn();
    const handler = createVdotPresentationBoundary({ authenticate, verifyOwnedAthlete, calculate });
    expect(await handler({ kind: 'paces', vdot: 50 }, {}))
      .toEqual({ status: 503, body: { error: 'unavailable' } });
    expect(authenticate).not.toHaveBeenCalled();
    expect(calculate).not.toHaveBeenCalled();
  });
  it('refuses client-supplied ownership flags without independent resolver proof', () => {
    const identity = { id: 'user-A', athleteId: 'attacker-athlete', ownedAthleteVerified: true };
    expect(hasVerifiedVdotOwner(identity, undefined)).toBe(false);
    expect(hasVerifiedVdotOwner(identity, { userId: 'user-A', athleteId: 'athlete-A' })).toBe(false);
    expect(hasVerifiedVdotOwner(identity, { userId: 'user-A', athleteId: 'athlete-A',
      verifiedByServer: 'true' })).toBe(false);
    expect(hasVerifiedVdotOwner(identity, { userId: 'user-A', athleteId: 'athlete-A',
      verifiedByServer: true })).toBe(true);
  });
  it('fails closed on missing identity, mismatched owner and blank resolved athlete', () => {
    const proof = { userId: 'user-A', athleteId: 'athlete-A', verifiedByServer: true };
    for (const identity of [null, undefined, {}, [], { id: '' }, { id: ' ' },
      { id: 'user-B' }, { id: 42 }]) {
      expect(hasVerifiedVdotOwner(identity, proof)).toBe(false);
    }
    for (const ownership of [null, undefined, {}, [], { userId: 'user-B',
      athleteId: 'athlete-A', verifiedByServer: true },
      { userId: 'user-A', athleteId: ' ', verifiedByServer: true },
      { userId: 'user-A', athleteId: 'athlete-A', verifiedByServer: false },
      { userId: 'user-A', athleteId: 'athlete-A', verifiedByServer: 1 }]) {
      expect(hasVerifiedVdotOwner({ id: 'user-A' }, ownership)).toBe(false);
    }
  });
  it('requires server auth, server owner resolver and calculator dependencies', () => {
    const authenticate = vi.fn();
    const calculate = vi.fn();
    const verifyOwnedAthlete = vi.fn();
    expect(() => createVdotPresentationBoundary({ authenticate, calculate } as never))
      .toThrow('server_dependencies_required');
    expect(() => createVdotPresentationBoundary({ authenticate, verifyOwnedAthlete } as never))
      .toThrow('server_dependencies_required');
    const handler = createVdotPresentationBoundary({ authenticate, verifyOwnedAthlete, calculate });
    expect(handler).toBeTypeOf('function');
  });
  it('does not call auth, ownership resolver, or calculation while disabled', async () => {
    const authenticate = vi.fn();
    const verifyOwnedAthlete = vi.fn();
    const calculate = vi.fn();
    const handler = createVdotPresentationBoundary({ authenticate, verifyOwnedAthlete, calculate });
    expect(await handler({ kind: 'paces', vdot: 52, athleteId: 'spoofed' }, {
      ownedAthleteVerified: true,
    })).toEqual({ status: 503, body: { error: 'unavailable' } });
    expect(authenticate).not.toHaveBeenCalled();
    expect(verifyOwnedAthlete).not.toHaveBeenCalled();
    expect(calculate).not.toHaveBeenCalled();
  });
  it('fails closed before any dependency invocation even if providers throw', async () => {
    const authenticate = vi.fn().mockRejectedValue(new Error('do not expose auth details'));
    const verifyOwnedAthlete = vi.fn().mockRejectedValue(new Error('do not expose records'));
    const calculate = vi.fn().mockRejectedValue(new Error('do not expose model'));
    const handler = createVdotPresentationBoundary({ authenticate, verifyOwnedAthlete, calculate });
    for (const request of [undefined, null, { kind: 'paces', vdot: 50 },
      { kind: 'norwegian', vdot: 52, format: '10x1000', athleteId: 'spoofed' }]) {
      expect(await handler(request, { id: 'user', ownedAthleteVerified: true }))
        .toEqual({ status: 503, body: { error: 'unavailable' } });
    }
    expect(authenticate).not.toHaveBeenCalled();
    expect(verifyOwnedAthlete).not.toHaveBeenCalled();
    expect(calculate).not.toHaveBeenCalled();
  });
  it('requires exact authenticated owner equality, not coercible identities', () => {
    const identity = { id: 'u-1' };
    for (const proof of [
      { userId: 1, athleteId: 'athlete', verifiedByServer: true },
      { userId: 'u-1 ', athleteId: 'athlete', verifiedByServer: true },
      { userId: 'u-2', athleteId: 'athlete', verifiedByServer: true },
      { userId: 'u-1', athleteId: 123, verifiedByServer: true },
      { userId: 'u-1', athleteId: '', verifiedByServer: true },
      { userId: 'u-1', athleteId: 'athlete', verifiedByServer: 'true' },
    ]) expect(hasVerifiedVdotOwner(identity, proof)).toBe(false);
  });
  it('rejects missing dependencies', () => {
    expect(() => createVdotPresentationBoundary({} as never)).toThrow('server_dependencies_required');
  });
});
