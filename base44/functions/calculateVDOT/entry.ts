// base44/functions/calculateVDOT/entry.ts
// Secure backend endpoint for Jack Daniels VDOT calculations (S6 IP Protection)

import { createClientFromRequest } from 'npm:@base44/runtime';

function calculateVDOT(timeSeconds: number, distanceMeters: number): number {
  if (timeSeconds <= 0 || distanceMeters <= 0) {
    throw new Error('Time and distance must be positive numbers');
  }
  if (timeSeconds < 180 || distanceMeters < 1200) {
    throw new Error('VDOT requires >= 180 s and >= 1200 m');
  }
  const timeMinutes = timeSeconds / 60;
  const v = distanceMeters / timeMinutes;
  const vo2Cost = -4.6 + 0.182258 * v + 0.000104 * Math.pow(v, 2);
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes) + 0.2989558 * Math.exp(-0.1932605 * timeMinutes);
  return Number((vo2Cost / pct).toFixed(2));
}

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { timeSeconds, distanceMeters, action = 'calculate' } = body;

    if (!timeSeconds || !distanceMeters) {
      return new Response(JSON.stringify({ error: 'Missing timeSeconds or distanceMeters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vdot = calculateVDOT(timeSeconds, distanceMeters);

    return new Response(JSON.stringify({ vdot }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
