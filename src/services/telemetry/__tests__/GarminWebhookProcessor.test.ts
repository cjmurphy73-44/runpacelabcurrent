import { describe, it, expect } from 'vitest';
import { GarminWebhookProcessor, WebhookLogEntry } from '../GarminWebhookProcessor';

describe('GarminWebhookProcessor', () => {
  const processor = new GarminWebhookProcessor();

  it('correctly processes and normalizes a raw garmin activity payload', () => {
    const mockLog: WebhookLogEntry = {
      id: 'log_123',
      provider: 'garmin',
      payloadType: 'activity',
      data: {
        activityId: 987654,
        startTimeInSeconds: 1690000000,
        durationInSeconds: 3600,
        distanceInMeters: 10000,
        averageHeartRateInBeatsPerMinute: 155,
        activityType: 'RUNNING',
      },
      processed: false,
      createdAt: new Date().toISOString(),
    };

    const result = processor.processActivityPayload(mockLog);

    expect(result.logId).toBe('log_123');
    expect(result.activity).toBeDefined();
    expect(result.activity.provider).toBe('garmin');
    expect(result.activity.distanceMeters).toBe(10000);
    expect(result.activity.durationSeconds).toBe(3600);
  });

  it('throws an error for non-garmin or invalid payload types', () => {
    const invalidLog: WebhookLogEntry = {
      id: 'log_999',
      provider: 'strava',
      payloadType: 'activity',
      data: {},
      processed: false,
      createdAt: new Date().toISOString(),
    };

    expect(() => processor.processActivityPayload(invalidLog)).toThrow();
  });
});
