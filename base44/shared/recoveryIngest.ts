// base44/shared/recoveryIngest.ts
// Provider-agnostic recovery ingestion pipeline.
//   normalizer (per provider) -> NormalizedRecovery -> ingestRecovery() -> DailyMetrics upsert
// Adding Suunto/Apple/Polar/Samsung later = a new normalizer function, same writer.
// Auto-overrides any manual entry for the date (wearable is authoritative), computes the
// holistic TrainPaceLab readiness, stores the vendor-native score alongside it, and logs
// idempotency via WebhookEvent so provider retries don't double-write.

import { computeHolisticReadiness, computeBaseline } from './readiness.ts';

export interface NormalizedRecovery {
  date: string;                       // YYYY-MM-DD
  hrv?: number | null;
  sleep_score?: number | null;
  sleep_duration_hours?: number | null;
  resting_hr?: number | null;
  body_battery?: number | null;
  stress_score?: number | null;
  provider_readiness_score?: number | null;
}

// Detect whether a Garmin webhook body is a Health/recovery summary rather than an activity.
export function isGarminHealthSummary(body: any): boolean {
  if (!body) return false;
  if (body.activity || body.workout) return false;
  const recoveryKeys = ['sleeps', 'sleep', 'hrv', 'hrvSummary', 'restingHeartRate', 'resting_heart_rate', 'bodyBattery', 'body_battery', 'stress', 'stress_score', 'trainingReadiness', 'training_readiness'];
  return recoveryKeys.some((k) => body[k] != null);
}

// Garmin Health summary payload -> normalized recovery. Defensive: harvests known field names
// across the variants Garmin Health can send.
export function normalizeGarminRecovery(body: any): NormalizedRecovery | null {
  const date = body.date || body.calendarDate || (body.startTime ? String(body.startTime).slice(0, 10) : null);
  if (!date) return null;

  const sleep = Array.isArray(body.sleeps) ? body.sleeps[0] : body.sleep;
  const sleepDurationSec = Number(sleep?.sleepTimeSeconds ?? sleep?.sleep_time_seconds ?? sleep?.duration_seconds ?? 0);

  const hrv = Number(body.hrv?.avgRmssd ?? body.hrv?.rmssd ?? body.hrv?.avg_rmssd ?? body.hrvSummary?.avgRmssd ?? body.hrv ?? body.hrv_ms ?? 0) || null;
  const restingHr = Number(body.restingHeartRate ?? body.resting_heart_rate ?? body.restingHr ?? 0) || null;
  const bodyBattery = Number(body.bodyBattery?.[0]?.batteryLevel ?? body.bodyBattery?.charged ?? body.body_battery ?? 0) || null;
  const stress = Number(body.stress?.avgStressLevel ?? body.stress?.avg_stress_level ?? body.stress_score ?? 0) || null;
  const sleepScore = Number(sleep?.sleepScore ?? body.sleepScore ?? body.sleep_score ?? 0) || null;
  const providerReadiness = Number(body.trainingReadiness?.score ?? body.training_readiness ?? bodyBodyFallback(bodyBattery) ?? 0) || null;

  return {
    date,
    hrv: hrv || null,
    sleep_score: sleepScore || null,
    sleep_duration_hours: sleepDurationSec ? Math.round((sleepDurationSec / 3600) * 100) / 100 : null,
    resting_hr: restingHr || null,
    body_battery: bodyBattery || null,
    stress_score: stress || null,
    provider_readiness_score: providerReadiness || null,
  };
}

function bodyBodyFallback(bb: number | null): number | null {
  return (typeof bb === 'number' && bb > 0) ? bb : null;
}

// COROS recovery record -> normalized. COROS exposes recovery, HRV, resting HR, sleep via MCP.
export function normalizeCorosRecovery(r: any): NormalizedRecovery | null {
  const date = r.date || (r.startTime ? String(r.startTime).slice(0, 10) : null) || (r.timestamp ? String(r.timestamp).slice(0, 10) : null);
  if (!date) return null;
  const hrv = Number(r.hrv ?? r.hrvMs ?? r.rmssd ?? 0) || null;
  const restingHr = Number(r.restingHeartRate ?? r.resting_hr ?? r.restingHr ?? 0) || null;
  const sleepScore = Number(r.sleepScore ?? r.sleep_score ?? 0) || null;
  const sleepHours = Number(r.sleepDurationHours ?? r.sleep_duration_hours ?? r.sleepHours ?? 0) || null;
  const recovery = Number(r.recovery ?? r.recoveryScore ?? r.readiness ?? r.recoveryScore ?? 0) || null;
  return {
    date,
    hrv: hrv || null,
    sleep_score: sleepScore || null,
    sleep_duration_hours: sleepHours || null,
    resting_hr: restingHr || null,
    body_battery: null,
    stress_score: null,
    provider_readiness_score: recovery || null,
  };
}

// ---- Additional provider normalizers (free OAuth wearables) ----
// Each maps that provider's daily recovery JSON into NormalizedRecovery, defensively
// harvesting known field names so a missing signal becomes null rather than a crash.

// Oura Ring (v2): daily_hrv, daily_sleep, daily_readiness, daily_activity documents.
export function normalizeOuraRecovery(hrvDoc: any, sleepDoc: any, readinessDoc: any, activityDoc?: any): NormalizedRecovery | null {
  const date = hrvDoc?.day || sleepDoc?.day || readinessDoc?.day || hrvDoc?.summary_date || sleepDoc?.summary_date;
  if (!date) return null;
  const hrv = Number(hrvDoc?.hrv?.average_rmssd ?? hrvDoc?.average_hrv ?? hrvDoc?.hrv_avg ?? 0) || null;
  const sleepScore = Number(sleepDoc?.score ?? sleepDoc?.sleep_score ?? 0) || null;
  const sleepHours = sleepDoc?.total_sleep_duration ? Number(sleepDoc.total_sleep_duration) / 3600 : null;
  const readiness = Number(readinessDoc?.score ?? readinessDoc?.readiness_score ?? 0) || null;
  const restingHr = Number(activityDoc?.resting_heart_rate ?? sleepDoc?.resting_heart_rate ?? 0) || null;
  return {
    date: String(date).slice(0, 10),
    hrv: hrv || null,
    sleep_score: sleepScore || null,
    sleep_duration_hours: sleepHours ? Math.round(sleepHours * 100) / 100 : null,
    resting_hr: restingHr || null,
    provider_readiness_score: readiness || null,
  };
}

// Whoop: recovery document. Whoop scores recovery 0-100 and reports HRV + RHR in the same payload.
export function normalizeWhoopRecovery(rec: any, cycleDate?: string): NormalizedRecovery | null {
  const date = cycleDate || rec?.created_at?.slice(0, 10) || rec?.date || rec?.sleep?.created_at?.slice(0, 10);
  if (!date) return null;
  const score = rec?.score ?? rec?.recovery_score ?? rec?.recovery?.score;
  const hrv = Number(rec?.hrv ?? rec?.heart_rate_variability ?? rec?.score?.hrv ?? 0) || null;
  const rhr = Number(rec?.resting_heart_rate ?? rec?.score?.resting_heart_rate ?? 0) || null;
  const sleepScore = Number(rec?.sleep_quality ?? rec?.score?.sleep_quality ?? 0) || null;
  return {
    date: String(date).slice(0, 10),
    hrv: hrv || null,
    resting_hr: rhr || null,
    sleep_score: sleepScore || null,
    provider_readiness_score: (typeof score === 'number' && score > 0) ? score : null,
  };
}

// Withings: HRV (heart getum), sleep, RHR (measure getmeas). Responses are nested.
export function normalizeWithingsRecovery(date: string, hrvMs?: number | null, sleepScore?: number | null, sleepHours?: number | null, rhr?: number | null): NormalizedRecovery | null {
  if (!date) return null;
  return {
    date: String(date).slice(0, 10),
    hrv: hrvMs || null,
    sleep_score: sleepScore || null,
    sleep_duration_hours: sleepHours ? Math.round(sleepHours * 100) / 100 : null,
    resting_hr: rhr || null,
  };
}

// Polar AccessLink: nightly_recharge + sleep. Recovery score 0-100.
export function normalizePolarRecovery(recharge: any, sleep: any): NormalizedRecovery | null {
  const date = recharge?.date || sleep?.date || recharge?.polar_user?.date;
  if (!date) return null;
  const recovery = Number(recharge?.nightly_recharge?.recharge_status?.score ?? recharge?.score ?? 0) || null;
  const hrv = Number(recharge?.heart_rate?.average_rr ?? recharge?.hrv ?? 0) || null;
  const rhr = Number(recharge?.breathing_rate?.average_rr ?? recharge?.resting_hr ?? sleep?.resting_heart_rate ?? 0) || null;
  const sleepScore = Number(sleep?.sleep_score ?? sleep?.sleep_summary?.sleep_score ?? 0) || null;
  const sleepHours = sleep?.total_sleep_time ? Number(sleep.total_sleep_time) / 3600 : null;
  return {
    date: String(date).slice(0, 10),
    hrv: hrv || null,
    resting_hr: rhr || null,
    sleep_score: sleepScore || null,
    sleep_duration_hours: sleepHours ? Math.round(sleepHours * 100) / 100 : null,
    provider_readiness_score: recovery || null,
  };
}

// Fitbit: hrv, sleep, profile/RHR. HRV from hrv/date.json -> value.nightlyRmssd; sleep -> summary.score.
export function normalizeFitbitRecovery(date: string, hrvDoc: any, sleepDoc: any, rhr?: number | null): NormalizedRecovery | null {
  if (!date) return null;
  const hrv = Number(hrvDoc?.value?.nightlyRmssd ?? hrvDoc?.nightlyRmssd ?? 0) || null;
  const sleepScore = Number(sleepDoc?.summary?.score ?? sleepDoc?.score ?? 0) || null;
  const sleepMs = sleepDoc?.summary?.totalTimeInBed ? Number(sleepDoc.summary.totalTimeInBed) * 60000 : (sleepDoc?.summary?.totalMinutesAsleep ? Number(sleepDoc.summary.totalMinutesAsleep) * 60000 : null);
  return {
    date: String(date).slice(0, 10),
    hrv: hrv || null,
    sleep_score: sleepScore || null,
    sleep_duration_hours: sleepMs ? Math.round((sleepMs / 3600000) * 100) / 100 : null,
    resting_hr: rhr || null,
  };
}

// Suunto: daily activity / sleep summary. Thin recovery data; harvest what's available.
export function normalizeSuuntoRecovery(r: any): NormalizedRecovery | null {
  const date = r.date || r.day || (r.startTime ? String(r.startTime).slice(0, 10) : null);
  if (!date) return null;
  const hrv = Number(r.hrv ?? r.hrvMs ?? r.rmssd ?? 0) || null;
  const rhr = Number(r.restingHeartRate ?? r.resting_hr ?? 0) || null;
  const sleepScore = Number(r.sleepScore ?? r.sleep_quality ?? 0) || null;
  const sleepHours = Number(r.sleepDurationHours ?? r.sleep_hours ?? 0) || null;
  const recovery = Number(r.recovery ?? r.recoveryScore ?? r.readiness ?? 0) || null;
  return {
    date: String(date).slice(0, 10),
    hrv: hrv || null,
    resting_hr: rhr || null,
    sleep_score: sleepScore || null,
    sleep_duration_hours: sleepHours || null,
    provider_readiness_score: recovery || null,
  };
}

// Upsert DailyMetrics with auto-override + holistic readiness; log idempotency.
// `history` = recent DailyMetrics (any order) used to derive rolling baselines.
export async function ingestRecovery(base44: any, athleteId: string, normalized: NormalizedRecovery, source: string, history: any[] = []) {
  // Idempotency: recovery event keyed on provider + athlete + date.
  const eventId = `${source}:${athleteId}:${normalized.date}:recovery`;
  try {
    const seen = await base44.asServiceRole.entities.WebhookEvent.filter({ event_id: eventId });
    if (seen.length > 0) return { skipped: true, idempotent: true };
  } catch { /* fail open */ }

  const hrvBase = computeBaseline(history, 'hrv');
  const rhrBase = computeBaseline(history, 'resting_hr');
  const sleepBase = computeBaseline(history, 'sleep_score');
  const sleepDurBase = computeBaseline(history, 'sleep_duration_hours');

  let tsb: number | null = null;
  const latestTsb = history.find((d: any) => typeof d?.calculated_tsb === 'number' && isFinite(d.calculated_tsb));
  if (latestTsb) tsb = latestTsb.calculated_tsb;

  const holistic = computeHolisticReadiness({
    hrv: normalized.hrv,
    sleep_score: normalized.sleep_score,
    sleep_duration_hours: normalized.sleep_duration_hours,
    resting_hr: normalized.resting_hr,
    body_battery: normalized.body_battery,
    stress_score: normalized.stress_score,
    tsb,
  }, { hrv: hrvBase, resting_hr: rhrBase, sleep_score: sleepBase, sleep_duration_hours: sleepDurBase });

  // Auto-override: wearable writes win over any manual entry for this date.
  const existing = await base44.asServiceRole.entities.DailyMetrics.filter({ athlete_id: athleteId, date: normalized.date });
  const rec = existing[0];

  const payload: any = {
    readiness_score: holistic,
    recovery_source: source,
  };
  if (normalized.hrv != null) payload.hrv = normalized.hrv;
  if (normalized.sleep_score != null) payload.sleep_score = normalized.sleep_score;
  if (normalized.sleep_duration_hours != null) payload.sleep_duration_hours = normalized.sleep_duration_hours;
  if (normalized.resting_hr != null) payload.resting_hr = normalized.resting_hr;
  if (normalized.body_battery != null) payload.body_battery = normalized.body_battery;
  if (normalized.stress_score != null) payload.stress_score = normalized.stress_score;
  if (normalized.provider_readiness_score != null) {
    payload.provider_readiness_score = normalized.provider_readiness_score;
    payload.provider_readiness_source = source;
  }

  let recordId: string;
  if (rec) {
    await base44.asServiceRole.entities.DailyMetrics.update(rec.id, payload);
    recordId = rec.id;
  } else {
    const created = await base44.asServiceRole.entities.DailyMetrics.create({ athlete_id: athleteId, date: normalized.date, ...payload });
    recordId = created.id;
  }

  try { await base44.asServiceRole.entities.WebhookEvent.create({ event_id: eventId, provider: source, athlete_id: athleteId, outcome: 'created' }); } catch { /* best-effort */ }
  return { skipped: false, daily_metrics_id: recordId, holistic_readiness: holistic };
}