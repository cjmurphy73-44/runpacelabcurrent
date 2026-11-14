import { describe, expect, it } from 'vitest';
import { canonicalRaceIdentity, requireExpectedRaceRevision, describeAtomicRaceBackend } from '../../../base44/shared/raceAtomicContract';
const race = { athlete_id: 'athlete-1', race_date: '2026-11-01', sport: 'running', distance_m: 5000, elapsed_seconds: 1200 };
describe('atomic race backend contract (pure, no database guarantees)', () => {
  it('produces stable identity for identical race data', () => {
    expect(canonicalRaceIdentity(race)).toBe(canonicalRaceIdentity({ ...race }));
  });
  it('distinguishes athletes and distinct performances', () => {
    const key = canonicalRaceIdentity(race);
    expect(canonicalRaceIdentity({ ...race, athlete_id: 'athlete-2' })).not.toBe(key);
    expect(canonicalRaceIdentity({ ...race, elapsed_seconds: 1201 })).not.toBe(key);
  });
  it('is unambiguous with separator-like athlete IDs', () => {
    expect(canonicalRaceIdentity({ ...race, athlete_id: 'a:b' })).not.toBe(canonicalRaceIdentity({ ...race, athlete_id: 'a', race_date: '2026-11-01' }));
  });
  it('rejects malformed identity fields', () => {
    for (const patch of [{ athlete_id: '' }, { elapsed_seconds: NaN }, { distance_m: 5000.5 }, { sport: 'cycling' }]) {
      expect(() => canonicalRaceIdentity({ ...race, ...patch })).toThrow('invalid_race_identity');
    }
  });
  it('requires exact positive integer revision', () => {
    expect(requireExpectedRaceRevision(3, 3)).toBe(4);
    expect(() => requireExpectedRaceRevision(2, 3)).toThrow('race_revision_conflict');
    expect(() => requireExpectedRaceRevision(NaN, 3)).toThrow();
  });
  it('refuses a backend without every atomic capability', () => {
    expect(describeAtomicRaceBackend({ uniqueRaceKey: true, atomicCompareAndSwap: true }).writeSafe).toBe(false);
    expect(describeAtomicRaceBackend(null).writeSafe).toBe(false);
  });
  it('accepts explicit capability evidence only as a design input, not a deployment switch', () => {
    expect(describeAtomicRaceBackend({ uniqueRaceKey: true, atomicCompareAndSwap: true,
      durableOwnerAssignment: true, isolatedStaging: true }).writeSafe).toBe(true);
  });
});
