import { describe, it, expect } from 'vitest';
import { GarminAdapter } from '../GarminAdapter';

describe('GarminAdapter', () => {
  it('should parse recovery metrics (HRV and sleep) correctly', () => {
    const rawData = {
      timestamp: 1725000000000,
      hrv_intervals: [45, 48, 52],
      sleep_stages: { score: 85, duration: 28800 }
    };

    const streams = GarminAdapter.parsePayload(rawData);
    expect(streams).toHaveLength(2);
    expect(streams[0]).toEqual({
      timestamp: 1725000000000,
      type: 'HRV',
      value: [45, 48, 52],
      source: 'GARMIN'
    });
    expect(streams[1]).toEqual({
      timestamp: 1725000000000,
      type: 'SLEEP',
      value: 85,
      source: 'GARMIN'
    });
  });

  it('should parse workout sample streams (HR, power, cadence, speed)', () => {
    const rawData = {
      timestamp: 1725000000000,
      samples: [
        { timestamp: 1725000001000, heartRate: 145, power: 250, cadence: 90, speed: 3.5 },
        { timestamp: 1725000002000, heartRate: 148, power: 255, cadence: 91, speed: 3.6 }
      ]
    };

    const streams = GarminAdapter.parsePayload(rawData);
    expect(streams).toHaveLength(8); // 4 stream types * 2 samples
    expect(streams.filter(s => s.type === 'HEART_RATE')).toHaveLength(2);
    expect(streams.filter(s => s.type === 'POWER')).toHaveLength(2);
  });

  it('should normalize activity objects and stream lists', () => {
    const rawActivity = {
      activityId: 'garmin_123',
      startTimeLocal: '2026-09-01T08:00:00Z',
      activityType: 'running',
      durationInSeconds: 3600,
      distanceInMeters: 10000,
      samples: [
        { timestamp: 1725000001000, heartRate: 150 }
      ]
    };

    const normalized = GarminAdapter.normalizeActivity(rawActivity);
    expect(normalized.sessionId).toBe('garmin_123');
    expect(normalized.durationMinutes).toBe(60);
    expect(normalized.dataStreams.length).toBeGreaterThan(0);
  });
});
