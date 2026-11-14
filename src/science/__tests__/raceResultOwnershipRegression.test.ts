import { describe, expect, it } from 'vitest';
import { findDuplicateRaceResult, raceResultIdentity } from '../../../base44/shared/raceResultContract';
const race = { race_date: '2026-11-01', distance_m: 5000, elapsed_seconds: 1200, sport: 'running',
  evidence_source: 'athlete_attested', evidence_status: 'self_reported' };
describe('race-result duplicate and correction regression', () => {
  it('finds matching existing self-reported record', () => {
    expect(findDuplicateRaceResult([{ ...race, id: 'owned' }], race)?.id).toBe('owned');
  });
  it('does not match a different distance or time', () => {
    expect(findDuplicateRaceResult([{ ...race, id: 'owned' }], { ...race, elapsed_seconds: 1201 })).toBeNull();
    expect(findDuplicateRaceResult([{ ...race, id: 'owned' }], { ...race, distance_m: 10000 })).toBeNull();
  });
  it('excludes the current record when correcting itself', () => {
    expect(findDuplicateRaceResult([{ ...race, id: 'owned' }], race, 'owned')).toBeNull();
  });
  it('rejects nonfinite duplicate keys', () => {
    expect(raceResultIdentity({ ...race, distance_m: Infinity })).toBeNull();
  });
  it('does not treat provider-verified claim as athlete attestation', () => {
    expect(findDuplicateRaceResult([{ ...race, id: 'x', evidence_status: 'verified' }], race)).toBeNull();
  });
});
