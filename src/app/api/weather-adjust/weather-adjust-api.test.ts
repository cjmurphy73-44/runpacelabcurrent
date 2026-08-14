import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /api/weather-adjust', () => {
  it('returns 200 OK with adjusted pace for hot and humid conditions', async () => {
    const req = new Request('http://localhost/api/weather-adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPaceSecondsPerKm: 240, // 4:00/km
        temperatureC: 30,
        relativeHumidity: 80,
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.adjustedPaceSecondsPerKm).toBeGreaterThan(240);
    expect(body.data.dewPointC).toBeDefined();
    expect(body.data.formattedAdjustedPace).toBeDefined();
  });

  it('calculates altitude adjustments correctly when altitudeMeters is supplied', async () => {
    const req = new Request('http://localhost/api/weather-adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPaceSecondsPerKm: 240,
        temperatureC: 20,
        relativeHumidity: 50,
        altitudeMeters: 2200, // High altitude
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.altitudeFactor).toBeGreaterThan(1.0);
    expect(body.data.adjustedPaceSecondsPerKm).toBeGreaterThan(240);
  });

  it('returns 400 Bad Request when relativeHumidity is out of range', async () => {
    const req = new Request('http://localhost/api/weather-adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPaceSecondsPerKm: 240,
        temperatureC: 25,
        relativeHumidity: 110, // Invalid > 100%
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation Error');
    expect(body.details[0].message).toContain('relativeHumidity must be at most 100%');
  });

  it('returns 400 Bad Request when targetPaceSecondsPerKm is negative or zero', async () => {
    const req = new Request('http://localhost/api/weather-adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPaceSecondsPerKm: -10,
        temperatureC: 20,
        relativeHumidity: 50,
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation Error');
  });
});
