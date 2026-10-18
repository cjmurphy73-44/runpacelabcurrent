import { describe, it, expect } from 'vitest';
import { checkDuplicateActivity } from './deduplication';

describe('Activity Deduplication Engine', () => {
  it('detects fuzzy duplicate within 5 min window and close distance/duration', () => {
    const existingActivity = {
      id: 'act_1',
      start_time: '2026-10-18T07:00:00Z',
      distance_meters: 10000,
      moving_time_seconds: 2400,
      provider: 'garmin'
    };

    const incomingActivity = {
      start_time: '2026-10-18T07:03:00Z', // 3 minutes later
      distance_meters: 10020,             // 20m difference
      moving_time_seconds: 2405,          // 5s difference
      provider: 'strava'
    };

    const result = checkDuplicateActivity(incomingActivity, [existingActivity]);

    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe('FUZZY_TIME_DISTANCE');
    expect(result.confidenceScore).toBeGreaterThan(0.3);
    expect(result.action).toBe('REJECT_DUPLICATE');
  });
});
