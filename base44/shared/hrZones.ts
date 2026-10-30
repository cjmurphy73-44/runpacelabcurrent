// base44/shared/hrZones.ts
// Karvonen (Heart-Rate-Reserve) zone model + true time-in-zone accumulation.
//
// Replaces the old "% of max HR" buckets. Boundaries are anchored to each athlete's
// own resting and maximum HR, so identical heart rates land in different zones for
// two athletes with different physiology. Time is accumulated from second-by-second
// streams (preferred) or lap segments; only when neither exists does the session fall
// back to a single-zone estimate from average HR — and the caller stores which method
// was used so the UI can say so instead of implying false precision.

export const ZONE_LABELS = ['Z1 Recovery', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Threshold', 'Z5 Anaerobic'];

// Zone floors as a fraction of Heart Rate Reserve. Z1 covers everything from 50% HRR
// upward; samples below 50% HRR are still counted in Z1 rather than discarded, so the
// distribution always sums to the tracked session time.
const HRR_FLOORS = [0.5, 0.6, 0.7, 0.8, 0.9];

function safeInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Six boundaries in bpm: [Z1 floor, Z2 floor, Z3 floor, Z4 floor, Z5 floor, max].
export function zoneFloorBpm(restHr, maxHr) {
  const rest = safeInt(restHr, 60);
  const max = safeInt(maxHr, 190);
  if (max <= rest) return [];
  return [...HRR_FLOORS.map((f) => Math.round(rest + f * (max - rest))), Math.round(max)];
}

// 0-based zone index (0 = Z1 ... 4 = Z5) for a single heart-rate reading.
export function zoneIndexForHeartRate(hr, restHr, maxHr) {
  const rest = safeInt(restHr, 60);
  const max = safeInt(maxHr, 190);
  if (!Number.isFinite(hr) || hr <= 0 || max <= rest) return 0;
  const hrr = (hr - rest) / (max - rest);
  if (hrr < HRR_FLOORS[0]) return 0; // below 50% HRR still counts as recovery work
  const idx = Math.floor(hrr * 10) - 5;
  return Math.max(0, Math.min(4, idx));
}

// Accumulate seconds per zone across a second-by-second stream. Gaps longer than 60s
// are treated as pauses and excluded, and the last known HR is carried forward so a
// dropped sample does not silently shrink the tracked time.
export function timeInZoneFromStream(stream, restHr, maxHr) {
  const seconds = [0, 0, 0, 0, 0];
  let covered = 0;
  let total = 0;
  if (!Array.isArray(stream) || stream.length < 2 || !maxHr) {
    return { zone_seconds: seconds, covered_seconds: 0, total_seconds: 0 };
  }
  let lastHr = null;
  for (let i = 0; i < stream.length; i++) {
    const pt = stream[i] || {};
    const prev = stream[i - 1] || {};
    if (i > 0) {
      const raw = Number(pt.time) - Number(prev.time);
      const dt = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 60) : 0;
      if (dt > 0) {
        total += dt;
        const hr = Number.isFinite(pt.heart_rate) && pt.heart_rate > 0 ? pt.heart_rate : lastHr;
        if (Number.isFinite(hr) && hr > 0) {
          seconds[zoneIndexForHeartRate(hr, restHr, maxHr)] += dt;
          covered += dt;
        }
      }
    }
    if (Number.isFinite(pt.heart_rate) && pt.heart_rate > 0) lastHr = pt.heart_rate;
  }
  return {
    zone_seconds: seconds.map((s) => Math.round(s)),
    covered_seconds: Math.round(covered),
    total_seconds: Math.round(total),
  };
}

// Accumulate seconds per zone from lap segments (FIT message 19 / TCX <Lap>).
export function timeInZoneFromLaps(laps, restHr, maxHr) {
  const seconds = [0, 0, 0, 0, 0];
  if (!Array.isArray(laps) || laps.length === 0 || !maxHr) {
    return { zone_seconds: seconds, covered_seconds: 0, total_seconds: 0 };
  }
  let covered = 0;
  for (const lap of laps) {
    const dur = Number(lap?.duration_s);
    const hr = Number(lap?.avg_hr);
    if (!Number.isFinite(dur) || dur <= 0 || !Number.isFinite(hr) || hr <= 0) continue;
    seconds[zoneIndexForHeartRate(hr, restHr, maxHr)] += dur;
    covered += dur;
  }
  return {
    zone_seconds: seconds.map((s) => Math.round(s)),
    covered_seconds: Math.round(covered),
    total_seconds: Math.round(covered),
  };
}

// Single-zone estimate from a session average — the honest last resort.
export function timeInZoneFromAverage(avgHr, durationSeconds, restHr, maxHr) {
  const seconds = [0, 0, 0, 0, 0];
  const dur = Math.max(0, Math.round(Number(durationSeconds) || 0));
  const hr = Number(avgHr);
  if (!dur || !Number.isFinite(hr) || hr <= 0 || !maxHr) {
    return { zone_seconds: seconds, covered_seconds: 0, total_seconds: 0 };
  }
  seconds[zoneIndexForHeartRate(hr, restHr, maxHr)] = dur;
  return { zone_seconds: seconds, covered_seconds: dur, total_seconds: dur };
}

// Resolve the best available zone distribution for a session and report which method
// produced it. A stream is only trusted when it actually covers a meaningful share of
// the session; otherwise laps win, then the average-HR estimate.
export function resolveTimeInZone({ stream, laps, avgHr, durationSeconds, restHr, maxHr }) {
  const bounds = zoneFloorBpm(restHr, maxHr);
  const duration = Math.max(0, Number(durationSeconds) || 0);

  const fromStream = timeInZoneFromStream(stream, restHr, maxHr);
  if (fromStream.covered_seconds >= 60 && (duration === 0 || fromStream.covered_seconds >= duration * 0.3)) {
    return {
      zone_seconds: fromStream.zone_seconds,
      zone_method: 'stream',
      zone_bounds_bpm: bounds,
      coverage_pct: duration ? Math.round((fromStream.covered_seconds / duration) * 100) : 100,
    };
  }

  const fromLaps = timeInZoneFromLaps(laps, restHr, maxHr);
  if (fromLaps.covered_seconds >= 60) {
    return {
      zone_seconds: fromLaps.zone_seconds,
      zone_method: 'laps',
      zone_bounds_bpm: bounds,
      coverage_pct: duration ? Math.round((fromLaps.covered_seconds / duration) * 100) : 100,
    };
  }

  const fromAvg = timeInZoneFromAverage(avgHr, duration, restHr, maxHr);
  if (fromAvg.covered_seconds > 0) {
    return {
      zone_seconds: fromAvg.zone_seconds,
      zone_method: 'average',
      zone_bounds_bpm: bounds,
      coverage_pct: 100,
    };
  }

  return { zone_seconds: [0, 0, 0, 0, 0], zone_method: 'none', zone_bounds_bpm: bounds, coverage_pct: 0 };
}