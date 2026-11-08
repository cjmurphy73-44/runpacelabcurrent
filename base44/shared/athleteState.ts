// base44/shared/athleteState.ts
// Server-side deterministic AthleteStateSummary, the exact JSON handed to the
// post-workout LLM, computed entirely in code ("hardcode math / AI prose").
//
// This is the Deno mirror of src/science/athleteState.ts: the frontend module is
// the tested reference implementation, this one runs inside the ingestion
// functions, which cannot import from src/. Same shape, same schema_version, so a
// summary from either side is interchangeable.
//
// Provenance:
//   measured_device     , the wearable reported the value (native calories,
//                          per-second / per-lap zone time).
//   calculated_estimate , our equations produced the value (normalized load,
//                          zone estimate from average HR).

const ACWR_SPIKE_THRESHOLD = 1.5;
const HIGH_RAMP_RATE_POINTS = 7;
const OVERREACHING_TSB_FLOOR = -30;
const OVERREACHING_MIN_CONSECUTIVE_DAYS = 3;
const MIN_ACWR_DAYS = 7;
const CTL_TAU_DAYS = 42;
const ATL_TAU_DAYS = 7;
const CHRONIC_TAU_DAYS = 28;

const round = (value, dp = 2) => {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, dp);
  return Math.round(value * f) / f;
};

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/** Rolling mean over an evenly sampled series. */
function rollingMean(values, window) {
  const w = Math.max(1, Math.round(window));
  const out = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= w) sum -= values[i - w];
    out.push(sum / Math.min(i + 1, w));
  }
  return out;
}

/** Resample an irregular channel onto a 1 s grid (last known value). */
function resampleToSeconds(stream, channel) {
  const clean = (stream || [])
    .filter((p) => finite(p.time) && finite(p[channel]) && p[channel] >= 0)
    .sort((a, b) => a.time - b.time);
  if (clean.length === 0) return [];
  const start = clean[0].time;
  const end = clean[clean.length - 1].time;
  if (end - start > 86400) return [];
  const out = [];
  let cursor = 0;
  for (let t = start; t <= end; t += 1) {
    while (cursor + 1 < clean.length && clean[cursor + 1].time <= t) cursor++;
    out.push(clean[cursor][channel]);
  }
  return out;
}

/**
 * Coggan Normalized Power: 30 s rolling average → 4th power → mean → 4th root.
 * Returns 0 when the stream is too short to normalize.
 */
export function normalizedPowerFromStream(stream, windowSeconds = 30) {
  const grid = resampleToSeconds(stream, 'power');
  if (grid.length < 30) return 0;
  const rolled = rollingMean(grid, windowSeconds);
  const fourth = rolled.reduce((s, v) => s + Math.pow(v, 4), 0) / rolled.length;
  return round(Math.pow(fourth, 0.25), 1);
}

/** NP / IF / TSS against FTP. */
export function cyclingNormalization(stream, ftpWatts, durationSeconds) {
  const ftp = finite(ftpWatts) ? ftpWatts : 0;
  const np = normalizedPowerFromStream(stream);
  if (!ftp || ftp <= 0 || np <= 0 || !durationSeconds || durationSeconds <= 0) return null;
  const intensityFactor = np / ftp;
  return {
    normalized_power_watts: np,
    intensity_factor: round(intensityFactor, 3),
    tss: round((durationSeconds * np * intensityFactor) / (ftp * 3600) * 100, 1),
  };
}

/** Which equation produced the session's load, from the stored record. */
export function sessionLoadDescriptor(workout) {
  const sport = (workout?.sport || '').toLowerCase();
  if (finite(workout?.session_tss) && workout.session_tss > 0) {
    return {
      method: sport.startsWith('cyc') ? 'power_tss' : 'gap_rtss',
      load: round(workout.session_tss, 1),
      intensity_factor: null,
    };
  }
  if (finite(workout?.session_trimp) && workout.session_trimp > 0) {
    return { method: 'banister_trimp', load: round(workout.session_trimp, 1), intensity_factor: null };
  }
  // Edwards TRIMP needs real time in zone. Without a verified stream the session has no
  // distribution, so this descriptor must not invent a load from estimated zones.
  const zones = workout?.zone_method === 'stream' && Array.isArray(workout?.zone_seconds) ? workout.zone_seconds : [];
  const weights = [1, 2, 3, 4, 5];
  const edwards = zones.reduce((sum, sec, i) => (finite(sec) && sec > 0 ? sum + (sec / 60) * weights[i] : sum), 0);
  if (edwards > 0) return { method: 'edwards_trimp', load: round(edwards, 1), intensity_factor: null };
  return { method: 'none', load: 0, intensity_factor: null };
}

/** Minute-of-day-free daily load map: same-day sessions are summed. */
export function dailyLoadsFromSessions(sessions) {
  const byDate = {};
  for (const s of sessions || []) {
    if (!s?.date) continue;
    const load = (finite(s.session_trimp) ? s.session_trimp : 0) || (finite(s.session_tss) ? s.session_tss : 0);
    if (!load) continue;
    byDate[s.date] = (byDate[s.date] || 0) + load;
  }
  return Object.keys(byDate)
    .sort()
    .map((date) => ({ date, load: round(byDate[date], 1) }));
}

/** EWMA CTL / ATL / TSB timeline. */
function buildLoadSeries(daily) {
  let ctl = 0;
  let atl = 0;
  const ctlDecay = Math.exp(-1 / CTL_TAU_DAYS);
  const atlDecay = Math.exp(-1 / ATL_TAU_DAYS);
  return daily.map((day) => {
    ctl = ctl * ctlDecay + day.load * (1 - ctlDecay);
    atl = atl * atlDecay + day.load * (1 - atlDecay);
    return { date: day.date, load: day.load, ctl: round(ctl, 2), atl: round(atl, 2), tsb: round(ctl - atl, 2) };
  });
}

/** ACWR (7-day ATL / 28-day chronic), seeded from the opening week. */
function acuteChronicRatio(daily) {
  if (daily.length < MIN_ACWR_DAYS) return null;
  const seed = daily.slice(0, MIN_ACWR_DAYS).reduce((s, d) => s + d.load, 0) / MIN_ACWR_DAYS;
  const atlDecay = Math.exp(-1 / ATL_TAU_DAYS);
  const chronicDecay = Math.exp(-1 / CHRONIC_TAU_DAYS);
  let atl = seed;
  let chronic = seed;
  for (const day of daily) {
    atl = atl * atlDecay + day.load * (1 - atlDecay);
    chronic = chronic * chronicDecay + day.load * (1 - chronicDecay);
  }
  if (chronic < 1) return null;
  return round(atl / chronic, 2);
}

function trailingTsbStreak(series, floor = OVERREACHING_TSB_FLOOR) {
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].tsb < floor) streak++;
    else break;
  }
  return streak;
}

/** Deterministic adaptation assessment over the athlete's session history. */
export function assessAdaptation(sessions) {
  const daily = dailyLoadsFromSessions(sessions);
  const series = buildLoadSeries(daily);
  const last = series[series.length - 1] || { ctl: 0, atl: 0, tsb: 0 };
  const acwr = acuteChronicRatio(daily);
  const ramp = series.length >= 8 ? round(last.ctl - series[series.length - 8].ctl, 2) : null;
  const streak = trailingTsbStreak(series);

  const flags = [];
  if (acwr !== null && acwr > ACWR_SPIKE_THRESHOLD) flags.push('ACWR_SPIKE_WARNING');
  if (ramp !== null && ramp > HIGH_RAMP_RATE_POINTS) flags.push('HIGH_RAMP_RATE');
  if (streak >= OVERREACHING_MIN_CONSECUTIVE_DAYS) flags.push('OVERREACHING_RISK');

  return {
    load_state: {
      ctl: round(last.ctl, 2),
      atl: round(last.atl, 2),
      tsb: round(last.tsb, 2),
      acwr,
      ctl_ramp_7d: ramp,
      tsb_negative_streak_days: streak,
    },
    flags,
  };
}

function zoneDistribution(zoneSeconds) {
  const seconds = [0, 1, 2, 3, 4].map((i) => (finite(zoneSeconds?.[i]) ? zoneSeconds[i] : 0));
  const total = seconds.reduce((s, v) => s + v, 0);
  if (total <= 0) return [0, 0, 0, 0, 0];
  return seconds.map((v) => round((v / total) * 100, 1));
}

/**
 * Build the summary for a stored session. Pure with respect to its inputs: the
 * only async work is loading the athlete's own session history.
 */
export async function buildAthleteStateSummary(base44, workout) {
  if (!workout) return null;
  const athleteId = workout.athlete_id;

  const sessions = athleteId
    ? await base44.asServiceRole.entities.WorkoutSession.filter({ athlete_id: athleteId }, 'date', 500).catch(() => [])
    : [];
  const history = sessions && sessions.length ? sessions : [workout];

  const adaptation = assessAdaptation(history);
  const load = sessionLoadDescriptor(workout);
  // Only a stream-derived distribution reaches the AI context. A stale or estimated
  // one is zeroed here so no summary-only session can influence synthesis.
  const zoneMethod = workout.zone_method === 'stream' ? 'stream' : 'none';
  const zoneSeconds = [0, 1, 2, 3, 4].map((i) =>
    zoneMethod === 'stream' && finite(workout.zone_seconds?.[i]) ? workout.zone_seconds[i] : 0,
  );
  const durationSeconds = workout.duration_seconds || Math.round((workout.duration_minutes || 0) * 60);
  const hasStream = Array.isArray(workout.streams) && workout.streams.length > 0;
  const decoupling = finite(workout.aerobic_decoupling) ? workout.aerobic_decoupling : null;

  const flags = [...adaptation.flags];
  if (decoupling !== null && decoupling > 5 && !flags.includes('ELEVATED_AEROBIC_DECOUPLING')) {
    flags.push('ELEVATED_AEROBIC_DECOUPLING');
  }

  return {
    schema_version: 1,
    athlete_id: athleteId,
    date: workout.date,
    sport: workout.sport,
    session: {
      duration_seconds: Math.round(durationSeconds),
      duration_minutes: round(durationSeconds / 60, 1),
      distance_km: finite(workout.distance_km) ? round(workout.distance_km, 2) : null,
      avg_hr: finite(workout.avg_hr) ? Math.round(workout.avg_hr) : null,
      max_hr: finite(workout.max_hr) ? Math.round(workout.max_hr) : null,
      avg_power_watts: finite(workout.avg_power) ? round(workout.avg_power, 0) : null,
      avg_pace_sec_per_km:
        finite(workout.distance_km) && workout.distance_km > 0 && durationSeconds > 0
          ? round(durationSeconds / workout.distance_km, 0)
          : null,
      calories: finite(workout.active_calories) ? round(workout.active_calories, 0) : null,
    },
    normalized: {
      method: load.method,
      load: load.load,
      intensity_factor: load.intensity_factor,
      normalized_power_watts: null,
      gap_sec_per_km: null,
      note: load.method === 'none' ? 'No usable load input for this session' : `Session load from ${load.method}`,
    },
    aerobic: {
      metric: (workout.sport || '').toLowerCase().startsWith('cyc') ? 'Pw:Hr' : 'Pa:Hr',
      efficiency_factor: finite(workout.efficiency_factor) ? round(workout.efficiency_factor, 4) : null,
      decoupling_pct: decoupling === null ? null : round(decoupling, 2),
      flag: decoupling !== null && decoupling > 5 ? 'ELEVATED_AEROBIC_DECOUPLING' : null,
    },
    zones: {
      zone_seconds: zoneSeconds,
      zone_method: zoneMethod,
      distribution_pct: zoneDistribution(zoneSeconds),
    },
    load_state: adaptation.load_state,
    adaptation_flags: flags,
    provenance: {
      session_load: 'calculated_estimate',
      calories: workout.calories_source === 'device' ? 'measured_device' : 'calculated_estimate',
      zones: zoneMethod === 'stream' ? 'measured_device' : 'calculated_estimate',
      streams: hasStream ? 'measured_device' : 'calculated_estimate',
    },
  };
}