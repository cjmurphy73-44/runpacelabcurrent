import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('POST /api/vdot', () => {
  it('returns 200 OK with accurate VDOT, equivalent times, and training paces for a valid 5k', async () => {
    // 5k (5000m) in 20 minutes (1200 seconds)
    const req = new Request('http://localhost:3000/api/vdot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        distanceMeters: 5000,
        timeSeconds: 1200,
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.vdot).toBeGreaterThan(45);
    expect(body.data.vdot).toBeLessThan(52);
    expect(body.data.trainingPaces).toHaveProperty('easy');
    expect(body.data.trainingPaces).toHaveProperty('threshold');
    expect(body.data.equivalentTimes).toHaveProperty('marathon');
  });

  it('returns 400 Bad Request when distanceMeters is missing or non-positive', async () => {
    const req = new Request('http://localhost:3000/api/vdot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        distanceMeters: -500,
        timeSeconds: 1200,
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation Error');
    expect(body.details[0].field).toBe('distanceMeters');
  });

  it('returns 400 Bad Request when timeSeconds is invalid', async () => {
    const req = new Request('http://localhost:3000/api/vdot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        distanceMeters: 10000,
        timeSeconds: "invalid_time",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation Error');
  });
});
