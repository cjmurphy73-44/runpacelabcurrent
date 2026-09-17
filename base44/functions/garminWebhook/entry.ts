import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { waitUntil } from 'base44:runtime';
import { VALID_SPORTS, calcTrimp, normalizeSport, parseFitSummary } from '../../shared/workoutIngest.ts';
import { isGarminHealthSummary, normalizeGarminRecovery, ingestRecovery } from '../../shared/recoveryIngest.ts';
import { recomputeCTLATLTSB } from '../../shared/ctlRecalc.ts';
import { runPostWorkoutEvaluation } from '../../shared/postWorkoutAI.ts';

function env(name) { try { return Deno.env.get(name) || ''; } catch { return ''; } }

// Garmin Health push-notification receiver. Garmin posts activity/summary
// payloads to this callback (configured in the Garmin Partner portal). The
// push is authenticated by an X-Garmin-Signature == GARMIN_WEBHOOK_SECRET.
// Each event runs through the WebhookEvent idempotency log (C-19) before ingest.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const webhookSecret = env('GARMIN_WEBHOOK_SECRET');
    if (!webhookSecret) return Response.json({ error: 'GARMIN_WEBHOOK_SECRET not configured' }, { status: 503 });
    const sig = req.headers.get('x-garmin-signature') || req.headers.get('x-garmin-health-signature');
    if (!sig || sig !== webhookSecret) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Resolve the athlete: prefer garmin_user_id → GarminConnection, else body.athlete_id.
    let athleteId = null, connection = null;
    const mapUid = body.user_id || body.garmin_user_id || body.userId;
    if (mapUid) {
      const conns = await base44.asServiceRole.entities.GarminConnection.filter({ garmin_user_id: String(mapUid) });
      if (conns[0]) { connection = conns[0]; athleteId = connection.athlete_id; }
    }
    if (!athleteId && body.athlete_id) athleteId = body.athlete_id;
    if (!athleteId) return Response.json({ error: 'Could not resolve athlete from Garmin payload' }, { status: 400 });

    // Garmin Health summary payload (sleep / HRV / resting HR / body battery / stress) — distinct
    // from an activity push. Route to the recovery ingestion path, which auto-overrides manual
    // entries, computes the holistic TrainPaceLab readiness, and returns within the 2s window
    // (no CTL/ATL recalc — recovery does not change training load).
    if (isGarminHealthSummary(body)) {
      const normalized = normalizeGarminRecovery(body);
      if (!normalized) return Response.json({ error: 'Could not parse Garmin Health summary' }, { status: 400 });
      const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
      if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });
      const history = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id: athleteId }, '-date', 30);
      try {
        const result = await ingestRecovery(base44, athleteId, normalized, 'garmin', history);
        if (connection) await base44.asServiceRole.entities.GarminConnection.update(connection.id, { last_sync_at: new Date().toISOString(), last_error: '' });
        return Response.json({ success: true, recovery: true, ...result });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    const activity = body.activity || body.workout || body;
    let summary = null, sourceFormat = 'webhook';
    if (body.fit_file_url || activity.fit_file_url) {
      try {
        const r = await fetch(body.fit_file_url || activity.fit_file_url);
        if (r.ok) { summary = parseFitSummary(new Uint8Array(await r.arrayBuffer())); sourceFormat = 'fit'; }
      } catch { /* fall through to JSON summary */ }
    }
    if (!summary) {
      const dur = Number(activity.duration_seconds ?? activity.duration ?? 0);
      const distRaw = activity.distance_km ?? (activity.distance_meters ? activity.distance_meters / 1000 : null);
      summary = {
        derived_date: activity.date || (activity.start_time ? activity.start_time.slice(0, 10) : null),
        sport: normalizeSport(activity.sport || activity.activity_type),
        duration_seconds: dur,
        distance_km: distRaw !== null ? Math.round(distRaw * 100) / 100 : (Number(activity.distance_km) || null),
        avg_hr: Number(activity.avg_heart_rate ?? activity.average_heart_rate) || null,
        max_hr: Number(activity.max_heart_rate) || null,
      };
    }

    const date = summary.derived_date;
    const durationMinutes = summary.duration_seconds ? summary.duration_seconds / 60 : Number(activity.duration_minutes || 0);
    if (!date || isNaN(Date.parse(date)) || durationMinutes < 1 || durationMinutes > 1440) return Response.json({ error: 'Invalid activity: missing date or duration out of range' }, { status: 400 });
    if (new Date(date) > new Date(Date.now() + 24 * 3600 * 1000)) return Response.json({ error: 'date cannot be in the future' }, { status: 400 });
    const sport = VALID_SPORTS.includes(summary.sport) ? summary.sport : 'running';
    const distanceKm = summary.distance_km || 0;

    const athlete = await base44.asServiceRole.entities.AthleteProfile.get(athleteId).catch(() => null);
    if (!athlete) return Response.json({ error: 'Athlete profile not found' }, { status: 404 });

    // Idempotency (C-19): Garmin retries pushes.
    const eventId = `garmin:${athleteId}:${date}:${sport}:${Math.round(durationMinutes * 100)}:${Math.round(distanceKm * 100)}`;
    try {
      const seen = await base44.asServiceRole.entities.WebhookEvent.filter({ event_id: eventId });
      if (seen.length > 0) return Response.json({ success: true, skipped: true, idempotent: true });
    } catch { /* fail open */ }

    const existing = await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athleteId, date });
    if (existing.some((s) => s.sport === sport && Math.abs((s.duration_minutes||0) - durationMinutes) < 1 && Math.abs((s.distance_km||0) - distanceKm) < 0.1)) {
      try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: 'generic', athlete_id: athleteId, outcome: 'skipped_duplicate' }); } catch {}
      return Response.json({ success: true, skipped: true });
    }

    const restHr = athlete.resting_hr || 60, maxHr = athlete.max_heart_rate || summary.max_hr || 190;
    const session = await base44.asServiceRole.entities.WorkoutSession.create({
      athlete_id: athleteId, date, sport,
      duration_minutes: Math.round(durationMinutes * 100) / 100, duration_seconds: Math.round(durationMinutes * 60),
      distance_km: distanceKm, avg_hr: summary.avg_hr || undefined, max_hr: summary.max_hr || undefined,
      source_format: sourceFormat, session_trimp: summary.avg_hr ? calcTrimp(durationMinutes, summary.avg_hr, restHr, maxHr, athlete.sex) : 0,
    });

    try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: 'generic', athlete_id: athleteId, workout_session_id: session.id, outcome: 'created' }); } catch {}
    try { await recomputeCTLATLTSB(base44, athleteId); } catch {}
    try { waitUntil(runPostWorkoutEvaluation(base44, session.id, athleteId)); } catch {}
    if (connection) await base44.asServiceRole.entities.GarminConnection.update(connection.id, { last_sync_at: new Date().toISOString(), last_error: '' });

    return Response.json({ success: true, workout_session_id: session.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});