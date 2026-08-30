// base44/functions/workoutWebhook/entry.ts
// Personalized per-athlete webhook endpoint for automated workout ingestion.
//   - External POST with ?key=<api_key> (or X-Api-Key header): ingest a JSON workout summary or a FIT byte stream.
//   - Strava subscription verification (GET ?hub.challenge=...) and Strava event POSTs (ack-only).
//   - App-user actions via base44.functions.invoke({ action: "generate_key" | "get_key" }).
// Each ingest triggers recalculateCTLATLTSB so CTL/ATL/TSB on the dashboard update automatically.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { waitUntil } from 'base44:runtime';
import { VALID_SPORTS, calcTrimp, normalizeSport, getOwnedAthlete, selfUrl, parseFitSummary } from '../../shared/workoutIngest.ts';

function randomKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// selfUrl, getOwnedAthlete and parseFitSummary are imported from ../../shared/workoutIngest.ts.

// Build a WorkoutSession-shaped summary from a flexible JSON payload.
function jsonToSummary(body) {
  const date = body.date || (body.start_time ? body.start_time.slice(0, 10) : null) || (body.timestamp ? body.timestamp.slice(0, 10) : null);
  const durationSeconds = Number(body.duration_seconds ?? body.duration ?? 0);
  let distanceKm = Number(body.distance_km ?? 0);
  if (!distanceKm && body.distance_m) distanceKm = body.distance_m / 1000;
  return {
    derived_date: date,
    sport: normalizeSport(body.sport || body.activity_type || body.type),
    duration_seconds: durationSeconds,
    distance_km: distanceKm ? Math.round(distanceKm * 100) / 100 : null,
    avg_hr: Number(body.avg_heart_rate ?? body.avg_hr ?? body.average_heart_rate) || null,
    max_hr: Number(body.max_heart_rate ?? body.max_hr) || null,
  };
}

async function handleIngest(req, base44, apiKey) {
  const athletes = await base44.asServiceRole.entities.AthleteProfile.filter({ webhook_api_key: apiKey });
  const athlete = athletes[0];
  if (!athlete) return Response.json({ error: 'Invalid API key' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Strava delivers only activity references (no full data). Acknowledge so it stops retrying;
  // full per-activity Strava import needs Strava OAuth (follow-up) — use the Bulk tab meanwhile.
  if (body.object_type && body.aspect_type) {
    return Response.json({ success: true, ack: true, note: 'Strava event acknowledged.' });
  }

  let summary = null;
  let sourceFormat = 'webhook';
  if (body.file_base64 && /\.fit$/i.test(body.file_name || '')) {
    try {
      const binary = Uint8Array.from(atob(body.file_base64), (c) => c.charCodeAt(0));
      summary = parseFitSummary(binary);
      sourceFormat = 'fit';
    } catch { summary = null; }
  } else if (body.fit_url) {
    try {
      const r = await fetch(body.fit_url);
      if (r.ok) { const buf = new Uint8Array(await r.arrayBuffer()); summary = parseFitSummary(buf); sourceFormat = 'fit'; }
    } catch { /* fall through to JSON */ }
  }
  if (!summary) summary = jsonToSummary(body);

  const date = summary.derived_date;
  const durationMinutes = summary.duration_seconds ? summary.duration_seconds / 60 : Number(body.duration_minutes || 0);
  if (!date || isNaN(Date.parse(date)) || durationMinutes < 1 || durationMinutes > 1440) {
    return Response.json({ error: 'Invalid payload: missing date or duration out of range (1 min – 24h).' }, { status: 400 });
  }
  if (new Date(date) > new Date(Date.now() + 24 * 3600 * 1000)) {
    return Response.json({ error: 'date cannot be in the future' }, { status: 400 });
  }
  const sport = VALID_SPORTS.includes(summary.sport) ? summary.sport : 'running';
  const distanceKm = summary.distance_km || 0;

  // Idempotency: providers retry (Strava re-sends, COROS re-post). Key on
  // athlete + date + sport + rounded duration/distance so a re-push of the SAME
  // event is skipped exactly once — independent of the looser (±1min / ±0.1km)
  // fuzzy dedup below, which fails when rounding jitter slips past its window.
  const eventId = `generic:${athlete.id}:${date}:${sport}:${Math.round(durationMinutes * 100)}:${Math.round(distanceKm * 100)}`;
  try {
    const seen = await base44.asServiceRole.entities.WebhookEvent.filter({ event_id: eventId });
    if (seen.length > 0) return Response.json({ success: true, skipped: true, idempotent: true });
  } catch (e) { console.warn('WebhookEvent idempotency check failed:', e); /* fail open */ }

  // Dedup safeguard (mirrors webhookWearableSync / bulkIngestWorkouts).
  const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athlete.id, date });
  const isDuplicate = existing.some((s) =>
    s.sport === sport && Math.abs((s.duration_minutes || 0) - durationMinutes) < 1 && Math.abs((s.distance_km || 0) - distanceKm) < 0.1
  );
  if (isDuplicate) {
    try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: 'generic', athlete_id: athlete.id, outcome: 'skipped_duplicate' }); } catch (e) { console.warn('WebhookEvent log failed:', e); }
    return Response.json({ success: true, skipped: true });
  }

  const restHr = athlete.resting_hr || 60;
  const maxHr = athlete.max_heart_rate || summary.max_hr || 190;
  const sessionTrimp = summary.avg_hr ? calcTrimp(durationMinutes, summary.avg_hr, restHr, maxHr, athlete.sex) : 0;

  const session = await base44.asServiceRole.entities.WorkoutSession.create({
    athlete_id: athlete.id,
    date,
    sport,
    duration_minutes: Math.round(durationMinutes * 100) / 100,
    duration_seconds: Math.round(durationMinutes * 60),
    distance_km: distanceKm,
    avg_hr: summary.avg_hr || undefined,
    max_hr: summary.max_hr || undefined,
    source_format: sourceFormat,
    session_trimp: sessionTrimp,
  });

  try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: 'generic', athlete_id: athlete.id, workout_session_id: session.id, outcome: 'created' }); } catch (e) { console.warn('WebhookEvent log failed:', e); }

  // Recompute CTL/ATL/TSB across all days so dashboard metrics update automatically.
  try { await base44.asServiceRole.functions.invoke('recalculateCTLATLTSB', { athlete_id: athlete.id }); } catch (e) { console.warn('recalculateCTLATLTSB failed:', e); }

  // Post-Workout Insight Engine: dispatch the AI coach to generate + persist a
  // WorkoutFeedback insight record (with intensity) for this session. Fire and
  // forget — the webhook returns immediately; the insight is linked back to the
  // session by postWorkoutAIEvaluation and surfaces in real time via ActivityDetail.
  try {
    waitUntil(base44.asServiceRole.functions.invoke('postWorkoutAIEvaluation', { workout_id: session.id, athlete_id: athlete.id }));
  } catch (e) { console.warn('postWorkoutAIEvaluation dispatch failed:', e); }

  return Response.json({ success: true, workout_session_id: session.id });
}

async function handleGenerateKey(req, base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ error: 'No athlete profile found' }, { status: 404 });
  const apiKey = randomKey();
  await base44.asServiceRole.entities.AthleteProfile.update(athlete.id, { webhook_api_key: apiKey });
  return Response.json({ api_key: apiKey, webhook_url: `${selfUrl(req)}?key=${apiKey}` });
}

async function handleGetKey(req, base44) {
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const athlete = await getOwnedAthlete(base44, user.id);
  if (!athlete) return Response.json({ api_key: null, webhook_url: null });
  const key = athlete.webhook_api_key || null;
  return Response.json({ api_key: key, webhook_url: key ? `${selfUrl(req)}?key=${key}` : null });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const u = new URL(req.url);

    // Strava subscription verification handshake (no key needed; Strava sends GET with hub.challenge).
    const hubChallenge = u.searchParams.get('hub.challenge');
    if (req.method === 'GET' && hubChallenge) {
      return Response.json({ 'hub.challenge': hubChallenge });
    }

    // External ingest: ?key= or X-Api-Key header.
    const apiKey = u.searchParams.get('key') || req.headers.get('x-api-key');
    if (apiKey) return await handleIngest(req, base44, apiKey);

    // App-user actions via base44.functions.invoke (POST { action }).
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    if (action === 'generate_key') return await handleGenerateKey(req, base44);
    if (action === 'get_key') return await handleGetKey(req, base44);
    return Response.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});