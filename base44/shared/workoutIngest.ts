// base44/shared/workoutIngest.ts
// Shared helpers used by the webhook-style workout ingest functions (corosSync, workoutWebhook).
// Plain module — no Deno.serve. Import from a function entry via:
//   import { calcTrimp, normalizeSport, ... } from '../../shared/workoutIngest.ts';

import fitParser from 'npm:fit-file-parser';

export const VALID_SPORTS = ['running', 'cycling', 'swimming', 'strength', 'triathlon', 'other'];

// Banister's HR-based TRIMP (sex-weighted exponential), the primary session stress metric.
export function calcTrimp(durationMin, avgHr, restHr, maxHr, sex) {
  if (!durationMin || !avgHr || !maxHr || maxHr <= restHr) return 0;
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const isFemale = sex === 'female';
  const a = isFemale ? 0.86 : 0.64;
  const b = isFemale ? 1.67 : 1.92;
  return Math.round(durationMin * hrr * a * Math.exp(b * hrr) * 100) / 100;
}

// Maps a raw activity-type string from a wearable export to our sport enum.
export function normalizeSport(raw) {
  if (!raw) return 'running';
  const s = String(raw).trim().toLowerCase();
  if (/run/.test(s)) return 'running';
  if (/(bike|cycl|ride|mtb)/.test(s)) return 'cycling';
  if (/swim/.test(s)) return 'swimming';
  if (/tri(athlon)?/.test(s)) return 'triathlon';
  if (/(strength|gym|weight|hiit|core)/.test(s)) return 'strength';
  return 'other';
}

// Public URL of the calling backend function — used as OAuth redirect_uri and to build personalized webhook URLs.
export function selfUrl(req) {
  const u = new URL(req.url);
  return u.origin + u.pathname;
}

// Resolve the AthleteProfile for a user. The profile explicitly linked on the user
// (user.data.athlete_profile_id, set by onboarding / backfill / self-heal) is authoritative
// and is fetched directly by ID — a filter by created_by_id misses profiles created under
// a different identity (e.g. a service-role backend function or an earlier auth account),
// which is exactly why a re-login "lost" an existing profile full of data. The link is
// trusted as-is (it is only set by trusted flows) and RLS would have gated the read at
// write time. Fall back to the most recently updated owned profile only when no link is set.
export async function getOwnedAthlete(base44, userId) {
  if (!userId) return null;
  const me = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
  const linkedId = me?.data?.athlete_profile_id || me?.athlete_profile_id || null;
  if (linkedId) {
    const linked = await base44.asServiceRole.entities.AthleteProfile.get(linkedId).catch(() => null);
    if (linked) return linked;
  }
  const athletes = await base44.asServiceRole.entities.AthleteProfile.filter({ created_by_id: userId }, '-updated_date', 50);
  return athletes[0] || null;
}

// Compact FIT summary parser (trimmed from bulkIngestWorkouts). Returns a session-level summary
// (avg/max HR, distance, duration, local-date) good enough for ingest dedup + TRIMP.
export function parseFitSummary(buffer) {
  const parser = new fitParser({ force: true, speedUnit: 'm/s', lengthUnit: 'm', mode: 'list' });
  let parsed = null;
  parser.parse(buffer, (err, data) => { if (!err) parsed = data; });
  if (!parsed) return null;
  const session = parsed.sessions?.[0] || null;
  const records = parsed.records || [];
  let durationSeconds = 0;
  if (typeof session?.total_timer_time === 'number' && session.total_timer_time > 0) durationSeconds = session.total_timer_time;
  else if (records.length > 1) {
    const f = records[0].timestamp, l = records[records.length - 1].timestamp;
    if (f instanceof Date && l instanceof Date) durationSeconds = (l.getTime() - f.getTime()) / 1000;
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) return null;
  const distanceKm = (session?.total_distance || 0) / 1000;
  let avgHr = session?.avg_heart_rate || null;
  let maxHr = session?.max_heart_rate || null;
  if (!avgHr && records.length) {
    const hrs = records.map((r) => r.heart_rate).filter((h) => h > 0);
    if (hrs.length) { avgHr = Math.round(hrs.reduce((s, h) => s + h, 0) / hrs.length); maxHr = Math.max(...hrs); }
  }
  const start = session?.start_time instanceof Date ? session.start_time : (records[0]?.timestamp instanceof Date ? records[0].timestamp : new Date());
  let tz = 0;
  for (const r of records) {
    if (r?.local_timestamp instanceof Date && r?.timestamp instanceof Date) { tz = r.local_timestamp.getTime() - r.timestamp.getTime(); break; }
  }
  return {
    avg_hr: avgHr || null,
    max_hr: maxHr || null,
    distance_km: Math.round(distanceKm * 100) / 100,
    duration_seconds: Math.round(durationSeconds),
    derived_date: new Date(start.getTime() + tz).toISOString().slice(0, 10),
  };
}