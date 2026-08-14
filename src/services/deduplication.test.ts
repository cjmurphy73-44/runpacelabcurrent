import { describe, expect, it } from 'vitest';
import {
  evaluateDeduplication,
  StreamSourcePriority,
  ExistingActivity,
  CandidateActivity,
} from './deduplication';

describe('Activity Deduplication Engine', () => {
  const baseTime = new Date('2026-08-14T08:00:00Z');

  const mockExisting: ExistingActivity[] = [
    {
      id: 'act-1',
      userId: 'user-123',
      externalActivityId: 'garmin-999',
      startTime: baseTime,
      distanceMeters: 10000,
      durationSeconds: 3000,
      streamSourcePriority: StreamSourcePriority.DIRECT_WEARABLE_API,
      provider: 'GARMIN',
    },
  ];

  it('detects exact external ID match from same provider', () => {
    const candidate: CandidateActivity = {
      userId: 'user-123',
      externalActivityId: 'garmin-999',
      startTime: baseTime,
      distanceMeters: 10000,
      durationSeconds: 3000,
      streamSourcePriority: StreamSourcePriority.FITNESS_HUB,
    };

    const result = evaluateDeduplication(candidate, mockExisting);

    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe('EXACT_EXTERNAL_ID');
    expect(result.confidenceScore).toBe(1.0);
    expect(result.action).toBe('REJECT_DUPLICATE');
    expect(result.existingActivityId).toBe('act-1');
  });

  it('detects fuzzy duplicate within 5 min window and close distance/duration', () => {
    const candidate: CandidateActivity = {
      userId: 'user-123',
      startTime: new Date('2026-08-14T08:02:00Z'),
      distanceMeters: 10050,
      durationSeconds: 3010,
      streamSourcePriority: StreamSourcePriority.FITNESS_HUB,
    };

    const result = evaluateDeduplication(candidate, mockExisting);

    expect(result.isDuplicate).toBe(true);
    expect(result.matchType).toBe('FUZZY_TIME_DISTANCE');
    expect(result.confidenceScore).toBeGreaterThan(0.7);
    expect(result.action).toBe('REJECT_DUPLICATE');
  });

  it('updates existing activity if candidate has HIGHER source priority', () => {
    const lowerPriorityExisting: ExistingActivity[] = [
      {
        id: 'act-ocr',
        userId: 'user-123',
        startTime: baseTime,
        distanceMeters: 10000,
        durationSeconds: 3000,
        streamSourcePriority: StreamSourcePriority.VISION_OCR,
      },
    ];

    const candidate: CandidateActivity = {
      userId: 'user-123',
      startTime: baseTime,
      distanceMeters: 10000,
      durationSeconds: 3000,
      streamSourcePriority: StreamSourcePriority.DIRECT_WEARABLE_API,
    };

    const result = evaluateDeduplication(candidate, lowerPriorityExisting);

    expect(result.isDuplicate).toBe(true);
    expect(result.action).toBe('UPDATE_EXISTING');
    expect(result.existingActivityId).toBe('act-ocr');
  });

  it('allows distinct run on same day outside time window', () => {
    const candidate: CandidateActivity = {
      userId: 'user-123',
      startTime: new Date('2026-08-14T17:00:00Z'),
      distanceMeters: 5000,
      durationSeconds: 1500,
      streamSourcePriority: StreamSourcePriority.DIRECT_WEARABLE_API,
    };

    const result = evaluateDeduplication(candidate, mockExisting);

    expect(result.isDuplicate).toBe(false);
    expect(result.matchType).toBe('NONE');
    expect(result.action).toBe('CREATE_NEW');
  });
});
