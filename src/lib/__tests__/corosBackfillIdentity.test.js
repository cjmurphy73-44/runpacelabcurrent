import { describe, expect, it } from 'vitest';
import { corosActivityId, matchingCorosRecordForBackfill } from '../../../base44/shared/corosActivityIdentity.ts';

describe('COROS historical original FIT identity', () => {
  const session = { source_provider: 'coros', provider_activity_id: corosActivityId(12345, 101), date: '2026-11-12' };
  const matching = { label_id: 12345, sport_type: 101, date: '2026-11-12' };
  it('selects only the exact provider activity when several share a day', () => {
    expect(matchingCorosRecordForBackfill(session, [
      { label_id: 98765, sport_type: 101, date: '2026-11-12', duration_seconds: 3600 },
      matching,
    ])).toEqual(matching);
  });
  it('fails closed when only the same sport and approximate duration match', () => {
    expect(matchingCorosRecordForBackfill(session, [{ label_id: 98765, sport_type: 101, date: session.date }])).toBeNull();
  });
  it('rejects different sport codes, dates, missing identity and foreign providers', () => {
    expect(matchingCorosRecordForBackfill(session, [{ ...matching, sport_type: 102 }])).toBeNull();
    expect(matchingCorosRecordForBackfill(session, [{ ...matching, date: '2026-11-13' }])).toBeNull();
    expect(matchingCorosRecordForBackfill({ ...session, provider_activity_id: undefined }, [matching])).toBeNull();
    expect(matchingCorosRecordForBackfill({ ...session, source_provider: 'garmin' }, [matching])).toBeNull();
  });
  it('rejects ambiguous duplicate provider records and empty results', () => {
    expect(matchingCorosRecordForBackfill(session, [matching, { ...matching }])).toBeNull();
    expect(matchingCorosRecordForBackfill(session, null)).toBeNull();
  });
});
