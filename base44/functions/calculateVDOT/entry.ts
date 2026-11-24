// base44/functions/calculateVDOT/entry.ts
// Secure backend endpoint for Jack Daniels VDOT calculations (S6 IP Protection)

import { calculateVDOT, danielsThresholdMs, formatPaceFromMs } from '../../shared/vdot.ts';

declare const Deno: { serve(handler: (req: Request) => Promise<Response>): unknown };

export default async function calculateRaceBaseline(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { timeSeconds, distanceMeters } = body;

    if (!Number.isFinite(timeSeconds) || !Number.isFinite(distanceMeters)) {
      return new Response(JSON.stringify({ error: 'Missing timeSeconds or distanceMeters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vdot = calculateVDOT(timeSeconds, distanceMeters);

    const thresholdPaceMs = danielsThresholdMs(vdot);
    return Response.json({ vdot, thresholdPaceMs, thresholdPaceFormatted: formatPaceFromMs(thresholdPaceMs) });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

if (typeof Deno !== 'undefined') Deno.serve(calculateRaceBaseline);
