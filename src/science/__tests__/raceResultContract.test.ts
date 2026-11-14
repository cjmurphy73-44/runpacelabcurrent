import { describe, expect, it } from 'vitest';
import { bestAttestedRaceResult, validateAttestedRaceResult, findDuplicateRaceResult, raceResultIdentity } from '../../../base44/shared/raceResultContract';
const now = Date.parse('2026-11-14T12:00:00Z');
const base = { race_date: '2026-11-01', distance_m: 5000, elapsed_seconds: 1200, sport: 'running' };
const saved = { ...base, evidence_source: 'athlete_attested', evidence_status: 'self_reported' };
describe('self-attested race result ingestion contract', () => {
  it('normalizes to self-reported even if a caller claims verification or a different athlete', () => {
    expect(validateAttestedRaceResult({ ...base, athlete_id: 'victim', evidence_status: 'verified' }, now))
      .toMatchObject({ evidence_source: 'athlete_attested', evidence_status: 'self_reported' });
  });
  it('rejects other sports and nonfinite race inputs', () => {
    expect(() => validateAttestedRaceResult({ ...base, sport: 'cycling' }, now)).toThrow();
    expect(() => validateAttestedRaceResult({ ...base, elapsed_seconds: Infinity }, now)).toThrow();
    expect(() => validateAttestedRaceResult({ ...base, distance_m: NaN }, now)).toThrow();
  });
  it('rejects invalid and future dates', () => {
    for (const date of ['2026-02-30', '2026-11-15', 'bad', '2026-13-01']) {
      expect(() => validateAttestedRaceResult({ ...base, race_date: date }, now)).toThrow();
    }
  });
  it('does not accept sprint or empty results', () => {
    expect(() => validateAttestedRaceResult({ ...base, elapsed_seconds: 100 }, now)).toThrow();
    expect(() => validateAttestedRaceResult(null, now)).toThrow();
  });
  it('never promotes a record that asserts verified status', () => {
    expect(bestAttestedRaceResult([{ ...saved, evidence_status: 'verified' }], now)).toBeNull();
  });
  it('ignores stale race results beyond six months', () => {
    expect(bestAttestedRaceResult([{ ...saved, race_date: '2025-01-01' }], now)).toBeNull();
  });
  it('selects the strongest qualifying attested race only', () => {
    const best = bestAttestedRaceResult([{ ...saved, elapsed_seconds: 1500 }, saved], now);
    expect(best?.record.elapsed_seconds).toBe(1200);
    expect(best?.vdot).toBeGreaterThan(0);
  });
  it('does not use a workout-like record without race provenance', () => {
    expect(bestAttestedRaceResult([{ ...base, source_provider: 'garmin' }], now)).toBeNull();
  });
  it('bounds user-provided descriptions', () => {
    expect(() => validateAttestedRaceResult({ ...base, notes: 'x'.repeat(501) }, now)).toThrow();
  });
  it('detects exact same-athlete race duplicates', () => {
    const existing = { ...saved, id: 'one' };
    expect(findDuplicateRaceResult([existing], saved)?.id).toBe('one');
  });
  it('allows a correction to retain its own race identity', () => {
    const existing = { ...saved, id: 'one' };
    expect(findDuplicateRaceResult([existing], saved, 'one')).toBeNull();
  });
  it('does not conflate two different finish times', () => {
    expect(findDuplicateRaceResult([{ ...saved, id: 'one' }], { ...saved, elapsed_seconds: 1201 })).toBeNull();
  });
  it('rejects malformed duplicate keys and unverified records', () => {
    expect(raceResultIdentity({ ...saved, distance_m: NaN })).toBeNull();
    expect(findDuplicateRaceResult([{ ...saved, id: 'one', evidence_status: 'verified' }], saved)).toBeNull();
  });
});
