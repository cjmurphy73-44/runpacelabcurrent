import { describe, expect, it } from 'vitest';
import { eligibleRacePerformance, usableStoredVdot, validVdotInputs } from '../../../base44/shared/vdotEvidence';
import { calculateVDOT as frontend } from '../vdot';
import { calculateVDOT as math } from '../../math/vdot';
import { getVdotPaceZones } from '../../lib/physiologyEngine';

const now = Date.parse('2026-11-14T12:00:00Z');
const race = { sport: 'running', is_race: true, date: '2026-11-01', duration_seconds: 1200, distance_km: 5 };
describe('VDOT evidence and placeholder safety', () => {
  it('rejects ordinary workouts as evidence of maximal race effort', () => {
    expect(eligibleRacePerformance({ ...race, is_race: false }, now)).toBe(false);
  });
  it('accepts explicitly race-marked valid running performance', () => {
    expect(eligibleRacePerformance(race, now)).toBe(true);
  });
  it('rejects non-running, future and stale race records', () => {
    expect(eligibleRacePerformance({ ...race, sport: 'cycling' }, now)).toBe(false);
    expect(eligibleRacePerformance({ ...race, date: '2026-11-15' }, now)).toBe(false);
    expect(eligibleRacePerformance({ ...race, date: '2025-01-01' }, now)).toBe(false);
  });
  it('rejects missing, negative, nonfinite and sprint inputs', () => {
    for (const [t, d] of [[null, 5000], [NaN, 5000], [Infinity, 5000], [-1, 5000], [100, 5000], [1200, 500]]) {
      expect(validVdotInputs(t, d)).toBe(false);
    }
  });
  it('never treats null or NaN stored VDOT as a known baseline', () => {
    expect(usableStoredVdot(null)).toBeNull();
    expect(usableStoredVdot(NaN)).toBeNull();
    expect(usableStoredVdot(0)).toBeNull();
    expect(usableStoredVdot(50)).toBe(50);
  });
  it('matches frontend and math engine for a 20-minute 5K', () => {
    expect(frontend(1200, 5000)).toBe(math(1200, 5000));
  });
  it('rejects nonfinite values across both VDOT engines', () => {
    for (const fn of [frontend, math]) {
      expect(() => fn(NaN, 5000)).toThrow();
      expect(() => fn(1200, Infinity)).toThrow();
    }
  });
  it('does not return fixed training paces without VDOT', () => {
    expect(getVdotPaceZones(NaN)).toBeNull();
    expect(getVdotPaceZones(0)).toBeNull();
  });
  it('returns calculated, VDOT-dependent training paces', () => {
    expect(getVdotPaceZones(40)?.threshold.secPerKm).not.toBe(getVdotPaceZones(60)?.threshold.secPerKm);
  });
});
