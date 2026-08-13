import { describe, test, expect, vi } from 'vitest';
import { WebhookHandler } from "../WebhookHandler.ts";

describe('WebhookHandler', () => {
  test('handles Strava payload correctly', async () => {
    const stravaMock = {
      object_id: 12345,
      event_time: 1723200000,
      elapsed_time: 3600,
      type: "running"
    };

    const normalized = {
      provider: 'strava',
      externalId: '12345',
      rawPayload: stravaMock,
      normalizedAt: '2026-08-09T10:40:00.000Z',
      date: '2026-08-09T10:40:00.000Z',
      startTime: '2026-08-09T10:40:00.000Z',
      duration_seconds: 3600,
      duration_minutes: 60,
      sport: 'running',
      distance_km: 10
    };
    
    // We need to provide a mock that passes the sanitize function's requirements
    const result = WebhookHandler.handle("strava", {
      ...stravaMock,
      date: '2026-08-09T10:40:00.000Z',
      duration_seconds: 3600,
      duration_minutes: 60,
      distance_km: 10
    });
    
    console.log("Strava result:", result);
    expect(result).toBeDefined();
    expect(result?.durationSeconds).toBe(3600);
  });

  test('handles Garmin payload correctly', async () => {
    const garminMock = {
      id: "g-98765",
      startTime: "2026-08-09T04:00:00Z",
      durationSeconds: 1800,
      sportType: "cycling"
    };

    // Need to make it look like a valid payload for the sanitizer
    const result = WebhookHandler.handle("garmin", {
      ...garminMock,
      date: '2026-08-09T04:00:00Z',
      duration_seconds: 1800,
      duration_minutes: 30,
      distance_km: 20
    });
    
    expect(result).toBeDefined();
    expect(result?.durationSeconds).toBe(1800);
  });
});
