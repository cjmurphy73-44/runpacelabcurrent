import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const VALID_SPORTS = ['running', 'cycling', 'swimming', 'strength', 'triathlon', 'other'];

// Map a raw activity label (from the OCR pass) onto our internal sport enum.
function mapActivityToSport(raw) {
  if (!raw || typeof raw !== 'string') return { sport: 'other', raw: null };
  const s = raw.trim().toLowerCase();
  if (!s) return { sport: 'other', raw: null };
  if (/run|jog/.test(s)) return { sport: 'running', raw: s };
  if (/(bike|cycl|ride|mtb)/.test(s)) return { sport: 'cycling', raw: s };
  if (/swim/.test(s)) return { sport: 'swimming', raw: s };
  if (/tri/.test(s)) return { sport: 'triathlon', raw: s };
  if (/(strength|gym|weight|hiit|core|lift)/.test(s)) return { sport: 'strength', raw: s };
  return { sport: 'other', raw: s };
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Clamp a heart-rate sample to physiological bounds; returns undefined when the
// source value is null/missing (so it is dropped from the payload, not saved as 0).
function clampHr(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.max(Math.round(n), 30), 230);
}

function toDateKey(s) {
  if (!s || typeof s !== 'string') return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  return isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { image_url } = body;
    if (!image_url || typeof image_url !== 'string') {
      return Response.json({ error: 'Invalid parameters', details: { image_url: 'missing' } }, { status: 400 });
    }

    // Resolve the calling user's athlete profile (best-effort — OCR may run before a
    // profile exists; the verification modal still works against the parsed fields).
    let athlete_id;
    try {
      const profiles = await base44.entities.AthleteProfile.filter({ created_by_id: user.id });
      if (profiles && profiles.length > 0) athlete_id = profiles[0].id;
    } catch { /* ignore — not required to run the OCR pass */ }

    const prompt = [
      'You are a precise workout-screenshot OCR engine.',
      'Extract the activity metrics shown in the image and return ONLY a JSON object (no prose, no markdown fences) with these fields:',
      '- activity_type: normalized to exactly one of running|cycling|swimming|strength|triathlon|other',
      '- start_time: the activity start as ISO 8601 datetime if visible (e.g. "2026-08-01T07:30:00"); otherwise an empty string',
      '- duration_seconds: total duration in seconds as a number',
      '- distance_km: distance in kilometers as a number (0 if not applicable, e.g. strength)',
      '- avg_pace_sec_km: average pace in seconds per km as a number (0 if not shown / not applicable)',
      '- avg_hr: average heart rate in bpm as an integer (0 if not shown)',
      '- max_hr: max heart rate in bpm as an integer (0 if not shown)',
      '- avg_power: average power in watts as a number (0 if not shown)',
      '- elevation_gain_m: elevation gain in meters as a number (0 if not shown)',
      '- confidence_score: your overall OCR confidence from 0.0 to 1.0',
      '- flagged_fields: array of field names whose value could not be read confidently',
      'If the image is not a workout/activity screenshot, set confidence_score to 0 and activity_type to other.',
    ].join('\n');

    const response_json_schema = {
      type: 'object',
      properties: {
        activity_type: { type: 'string' },
        start_time: { type: 'string' },
        duration_seconds: { type: 'number' },
        distance_km: { type: 'number' },
        avg_pace_sec_km: { type: 'number' },
        avg_hr: { type: 'integer' },
        max_hr: { type: 'integer' },
        avg_power: { type: 'number' },
        elevation_gain_m: { type: 'number' },
        confidence_score: { type: 'number' },
        flagged_fields: { type: 'array', items: { type: 'string' } },
      },
      required: ['activity_type', 'duration_seconds', 'distance_km', 'confidence_score', 'flagged_fields'],
    };

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [image_url],
      response_json_schema,
    });

    // InvokeLLM returns a dict when response_json_schema is provided; guard against a string fallback.
    const parsed = (llmRes && typeof llmRes === 'object' && !Array.isArray(llmRes))
      ? llmRes
      : (typeof llmRes === 'string' ? (() => { try { return JSON.parse(llmRes); } catch { return {}; } })() : {});

    const flagged = new Set(Array.isArray(parsed.flagged_fields) ? parsed.flagged_fields.map((f) => String(f)) : []);

    // --- Heuristics -----------------------------------------------------------
    // 1. Activity → sport enum; flag if the raw label didn't map cleanly.
    const { sport, raw: rawActivity } = mapActivityToSport(parsed.activity_type);
    if (!rawActivity || sport === 'other') flagged.add('activity_type');

    // 2. Clamp heart rate to 30–230 bpm; flag any value that was outside the band.
    const rawAvgHr = num(parsed.avg_hr, null);
    const rawMaxHr = num(parsed.max_hr, null);
    const avg_hr = clampHr(parsed.avg_hr);
    const max_hr = clampHr(parsed.max_hr);
    if (rawAvgHr !== null && (rawAvgHr < 30 || rawAvgHr > 230)) flagged.add('avg_hr');
    if (rawMaxHr !== null && (rawMaxHr < 30 || rawMaxHr > 230)) flagged.add('max_hr');

    // 3. Validate pace against distance/duration; flag if >20% off the computed sec/km.
    const duration_seconds = Math.max(0, Math.round(num(parsed.duration_seconds, 0)));
    const distance_km = Math.max(0, num(parsed.distance_km, 0));
    const avg_pace_sec_km = num(parsed.avg_pace_sec_km, null);
    if (avg_pace_sec_km !== null && avg_pace_sec_km > 0 && distance_km > 0 && duration_seconds > 0) {
      const expected = duration_seconds / distance_km;
      if (expected > 0 && Math.abs(avg_pace_sec_km - expected) / expected > 0.2) flagged.add('avg_pace_sec_km');
    }

    // 4. Clamp confidence to [0,1]; when overall confidence is low (<0.85) flag every
    //    populated numeric field so the verification modal highlights them in amber.
    let confidence = num(parsed.confidence_score, 0.5);
    confidence = Math.max(0, Math.min(1, confidence));
    if (confidence < 0.85) {
      ['duration_seconds', 'distance_km', 'avg_pace_sec_km', 'avg_hr', 'max_hr', 'avg_power', 'elevation_gain_m'].forEach((f) => {
        const v = parsed[f];
        if (v !== null && v !== undefined && Number(v) !== 0) flagged.add(f);
      });
    }

    const start_time = typeof parsed.start_time === 'string' && parsed.start_time ? parsed.start_time : null;
    const today = new Date().toISOString().slice(0, 10);
    const date = toDateKey(start_time) || today;

    const avg_power = num(parsed.avg_power, null);
    const elevation_gain_m = num(parsed.elevation_gain_m, null);

    return Response.json({
      athlete_id,
      image_url,
      activity_type: sport,
      raw_activity_type: rawActivity || (typeof parsed.activity_type === 'string' ? parsed.activity_type : null),
      start_time,
      date,
      duration_seconds,
      distance_km: Math.round(distance_km * 100) / 100,
      avg_pace_sec_km: avg_pace_sec_km !== null && avg_pace_sec_km > 0 ? Math.round(avg_pace_sec_km * 100) / 100 : null,
      avg_hr: avg_hr ?? null,
      max_hr: max_hr ?? null,
      avg_power: avg_power !== null && avg_power > 0 ? Math.round(avg_power * 10) / 10 : null,
      elevation_gain_m: elevation_gain_m !== null && elevation_gain_m > 0 ? Math.round(elevation_gain_m) : null,
      confidence_score: Math.round(confidence * 100) / 100,
      flagged_fields: [...flagged],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}