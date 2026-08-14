import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /api/zones', () => {
  it('returns 200 OK with HR zones when maxHr and restingHr are provided', async () => {
    const req = new Request('http://localhost/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxHr: 190, restingHr: 60 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.heartRateZones).toBeDefined();
    expect(body.data.heartRateZones.zone1).toBeDefined();
    expect(body.data.heartRateZones.zone5).toBeDefined();
  });

  it('returns 200 OK with Pace zones when thresholdPaceSecPerKm is provided', async () => {
    const req = new Request('http://localhost/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thresholdPaceSecPerKm: 240 }), // 4:00/km
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.paceZones).toBeDefined();
  });

  it('returns 400 Bad Request when no parameter is supplied', async () => {
    const req = new Request('http://localhost/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation Error');
  });

  it('returns 400 Bad Request when maxHr is out of physical range', async () => {
    const req = new Request('http://localhost/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxHr: 300 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details[0].message).toContain('maxHr must be at most 240 bpm');
  });
});
