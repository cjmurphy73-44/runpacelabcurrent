import { describe, expect, it } from 'vitest';
import { corosActivityId, isDuplicateCorosSession } from '../../../base44/shared/corosActivityIdentity';

const activity = (id?: string, distance_km = 10) => ({
  date: '2026-11-12', sport: 'running', duration_minutes: 50,
  distance_km, source_provider: 'coros', provider_activity_id: id,
});

describe('COROS retry identity', () => {
  it('derives a stable provider-scoped id from valid label and sport codes', () => {
    expect(corosActivityId('001234', 100)).toBe('100:001234');
    expect(corosActivityId(1234, 100)).toBe('100:1234');
    expect(corosActivityId('bad', 100)).toBeNull();
    expect(corosActivityId(1234, null)).toBeNull();
  });

  it('repeated provider activity is skipped even if later summary metrics differ', () => {
    expect(isDuplicateCorosSession(activity('100:123', 10), activity('100:123', 10.5))).toBe(true);
  });

  it('two same-day activities with different native IDs are distinct', () => {
    expect(isDuplicateCorosSession(activity('100:123'), activity('100:456'))).toBe(false);
  });

  it('IDs with different providers do not collide', () => {
    const garmin = { ...activity('100:123'), source_provider: 'garmin' };
    expect(isDuplicateCorosSession(garmin, activity('100:123'))).toBe(false);
  });

  it('legacy records without IDs use a conservative date/sport/duration/distance fallback', () => {
    expect(isDuplicateCorosSession(activity(undefined), activity('100:123'))).toBe(true);
    expect(isDuplicateCorosSession(activity(undefined, 15), activity('100:123'))).toBe(false);
  });

  it('different calendar dates cannot be duplicates', () => {
    expect(isDuplicateCorosSession({ ...activity('100:123'), date: '2026-11-11' }, activity('100:123'))).toBe(false);
  });
});
