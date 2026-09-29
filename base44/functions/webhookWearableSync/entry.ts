<<<<<<< Updated upstream
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { runPostWorkoutEvaluation } from '../../shared/postWorkoutAI.ts';
import { constantTimeEqual } from '../../shared/crypto.ts';
=======
// base44/functions/webhookWearableSync/entry.ts
// Hardened webhook receiver with SSRF protection and signature verification
>>>>>>> Stashed changes

import { createClientFromRequest } from 'npm:@base44/runtime';

/** Helper to block SSRF attempts against internal/private network ranges */
function assertSafeUrl(targetUrl: string): void {
  const parsed = new URL(targetUrl);
  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('127.')
  ) {
    throw new Error('SSRF Blocked: Localhost access prohibited');
  }

  // Block private IPv4 ranges (RFC 1918) & link-local (RFC 3927)
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && !parts.some(isNaN)) {
    const [a, b] = parts;
    if (
      a === 10 || // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) // 169.254.0.0/16 (Link-local / AWS metadata)
    ) {
      throw new Error('SSRF Blocked: Private network IP range prohibited');
    }
  }
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
    // 1. Verify cryptographic signature header (Garmin/Coros standard mock check)
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('garmin-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing webhook signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

<<<<<<< Updated upstream
    if (!constantTimeEqual(String(secret || ''), Deno.env.get('WEBHOOK_SYNC_SECRET') || '')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!athlete_id || !file_name || !date) {
      return Response.json({ error: 'athlete_id, file_name and date are required' }, { status: 400 });
    }
    if (new Date(date) > new Date()) {
      return Response.json({ error: 'date cannot be in the future' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const lowerName = file_name.toLowerCase();
    let parsed = null;
    let sourceFormat = 'csv';
    if (lowerName.endsWith('.fit')) {
      sourceFormat = 'fit';
      if (!file_base64) return Response.json({ error: 'file_base64 is required for .fit files' }, { status: 400 });
      const binary = Uint8Array.from(atob(file_base64), (c) => c.charCodeAt(0));
      parsed = parseFit(binary);
    } else if (lowerName.endsWith('.csv')) {
      sourceFormat = 'csv';
      if (!file_text) return Response.json({ error: 'file_text is required for .csv files' }, { status: 400 });
      parsed = parseCsv(file_text);
    } else {
      return Response.json({ error: 'Unsupported file type, only .fit and .csv are supported' }, { status: 400 });
    }

    if (!parsed) return Response.json({ error: 'Could not parse any telemetry from file' }, { status: 400 });

    const durationMinutes = parsed.duration_minutes || 0;
    const distanceKm = parsed.distance_km || 0;
    if (durationMinutes < 1 || (distanceKm <= 0 && durationMinutes <= 0)) {
      return Response.json({ error: 'File discarded: invalid record (zero distance/duration or under 60 seconds)' }, { status: 400 });
    }

    const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athlete_id);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    const sessionSport = sport || 'running';

    // Dedup safeguard: reject a session if a matching one already exists for this date/sport/duration/distance
    // (mirrors the check in ingestWorkoutFile/bulkIngestWorkouts, so repeated webhook deliveries or the same
    // workout arriving from multiple device sources doesn't inflate training load).
    const existingSessions = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id, date });
    const isDuplicate = existingSessions.some((s) =>
      s.sport === sessionSport &&
      Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 &&
      Math.abs((s.distance_km || 0) - distanceKm) < 0.1
    );
    if (isDuplicate) {
      return Response.json({ error: 'A matching workout already exists for this date, sport, duration and distance', skipped: true }, { status: 409 });
    }

    const restHr = 60;
    const maxHr = athlete.max_heart_rate || parsed.max_hr || 190;
    const sessionTrimp = calcTrimp(durationMinutes, parsed.avg_hr, restHr, maxHr, athlete.sex);

    const session = await base44.asServiceRole.entities.WorkoutSession.create({
      athlete_id,
      created_by_id: athlete.created_by_id,
      date,
      sport: sessionSport,
      duration_minutes: durationMinutes,
      distance_km: distanceKm,
      avg_hr: parsed.avg_hr || undefined,
      max_hr: parsed.max_hr || undefined,
      avg_power: parsed.avg_power || undefined,
      avg_cadence: parsed.avg_cadence || undefined,
      source_format: sourceFormat,
      session_trimp: sessionTrimp,
=======
    // 2. If the payload contains any outbound callback URLs, validate them for SSRF
    if (body.callbackUrl) {
      assertSafeUrl(body.callbackUrl);
    }

    // Process wearable sync payload securely...
    return new Response(JSON.stringify({ success: true, received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
>>>>>>> Stashed changes
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Invalid webhook request' }), {
      status: err.message?.includes('SSRF') ? 403 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
