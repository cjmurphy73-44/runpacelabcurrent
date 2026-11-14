// Pure helpers for the Advanced Workout Analytics detail view.

import { hasVerifiedStreams } from "@/lib/streamValidity";

const ZONE_BOUNDARIES = [0, 0.6, 0.7, 0.8, 0.9, 2];

// Buckets time spent in each of the 5 HR zones (% of max HR) from a real
// second-by-second stream. Without one, every bucket stays at zero: an average
// heart rate is never expanded into a synthetic distribution.
export function computeHrZoneDistribution(workout, maxHr) {
  const seconds = [0, 0, 0, 0, 0];
  if (!maxHr) return seconds.map(() => ({ pct: 0 }));

  if (workout.streams && workout.streams.length > 1) {
    for (let i = 1; i < workout.streams.length; i++) {
      const pt = workout.streams[i];
      const prev = workout.streams[i - 1];
      const dt = Math.max((pt.time || 0) - (prev.time || 0), 1);
      const pct = (pt.heart_rate || 0) / maxHr;
      for (let z = 0; z < 5; z++) {
        if (pct >= ZONE_BOUNDARIES[z] && pct < ZONE_BOUNDARIES[z + 1]) {
          seconds[z] += dt;
          break;
        }
      }
    }
  }

  const total = seconds.reduce((a, b) => a + b, 0);
  if (!total) return seconds.map(() => ({ pct: 0 }));
  return seconds.map((s) => ({ pct: (s / total) * 100 }));
}

// Keytel HR-based calorie estimate; falls back to a flat duration estimate
// when athlete weight/age aren't available.
export function estimateCalories(workout, athlete) {
  const durationMin = workout.duration_minutes || (workout.duration_seconds || 0) / 60;
  if (!durationMin) return 0;

  if (workout.avg_hr && athlete?.weight_kg && athlete?.age) {
    const isFemale = athlete.sex === "female";
    const perMin = isFemale
      ? (-20.4022 + 0.4472 * workout.avg_hr - 0.1263 * athlete.weight_kg + 0.074 * athlete.age) / 4.184
      : (-55.0969 + 0.6309 * workout.avg_hr + 0.1988 * athlete.weight_kg + 0.2017 * athlete.age) / 4.184;
    return Math.max(Math.round(perMin * durationMin), 0);
  }
  return Math.round(durationMin * 10);
}

// ---------------------------------------------------------------------------
// Session zone + energy resolution
// ---------------------------------------------------------------------------
// Zones are Karvonen (Heart-Rate-Reserve) based, anchored to THIS athlete's resting
// and max HR, never a fixed %-of-max table. Zones come from a verified second-by-second
// stream only, matching the backend. A session that arrived as a summary (average HR
// for the whole activity) has no distribution at all: nothing is estimated in its place.

export const ZONE_LABELS = ["Z1 Recovery", "Z2 Endurance", "Z3 Tempo", "Z4 Threshold", "Z5 Anaerobic"];

const HRR_FLOORS = [0.5, 0.6, 0.7, 0.8, 0.9];

function zoneIndexForHr(hr, restHr, maxHr) {
  if (!hr || !maxHr || maxHr <= restHr) return 0;
  const hrr = (hr - restHr) / (maxHr - restHr);
  if (hrr < HRR_FLOORS[0]) return 0;
  return Math.max(0, Math.min(4, Math.floor(hrr * 10) - 5));
}

export function zoneFloorBpm(restHr, maxHr) {
  if (!maxHr || maxHr <= restHr) return [];
  return [...HRR_FLOORS.map((f) => Math.round(restHr + f * (maxHr - restHr))), Math.round(maxHr)];
}

function buildZones(seconds) {
  const total = seconds.reduce((a, b) => a + b, 0);
  return seconds.map((s, i) => ({ zone: i + 1, label: ZONE_LABELS[i], seconds: Math.round(s), pct: total ? (s / total) * 100 : 0 }));
}

export function sessionZoneDistribution(workout, athlete) {
  const restHr = Number(athlete?.resting_hr) || 60;
  const maxHr = Number(athlete?.max_heart_rate) || Number(workout?.max_hr) || 190;
  const bounds = Array.isArray(workout?.zone_bounds_bpm) && workout.zone_bounds_bpm.length
    ? workout.zone_bounds_bpm
    : zoneFloorBpm(restHr, maxHr);

  // No genuine per-second stream means no distribution. Full stop.
  if (!hasVerifiedStreams(workout)) {
    return { zones: buildZones([0, 0, 0, 0, 0]), method: "none", bounds, totalSeconds: 0 };
  }

  const stored = Array.isArray(workout?.zone_seconds) ? workout.zone_seconds.map((s) => Number(s) || 0) : null;
  if (workout?.zone_method === "stream" && stored && stored.some((s) => s > 0)) {
    return { zones: buildZones(stored), method: "stream", bounds, totalSeconds: stored.reduce((a, b) => a + b, 0) };
  }

  const seconds = [0, 0, 0, 0, 0];
  const stream = workout.streams;
  let last = null;
  for (let i = 1; i < stream.length; i++) {
    const dt = Math.min(Math.max((stream[i].time || 0) - (stream[i - 1].time || 0), 0), 60);
    const hr = stream[i].heart_rate || last;
    if (dt && hr) seconds[zoneIndexForHr(hr, restHr, maxHr)] += dt;
    if (stream[i].heart_rate) last = stream[i].heart_rate;
  }
  if (seconds.some((s) => s > 0)) {
    return { zones: buildZones(seconds), method: "stream", bounds, totalSeconds: seconds.reduce((a, b) => a + b, 0) };
  }

  return { zones: buildZones([0, 0, 0, 0, 0]), method: "none", bounds, totalSeconds: 0 };
}

// Device-first calories. A stored device value is shown as-is with its provenance;
// only when the session has none does the estimate run, and it says so.
export function sessionCalories(workout, athlete) {
  const stored = Number(workout?.active_calories);
  if (stored > 0) {
    return {
      kcal: Math.round(stored),
      source: workout.calories_source || "device",
      basis: workout.calories_basis || null,
    };
  }
  const est = estimateCalories(workout, athlete);
  return { kcal: est || null, source: "estimated", basis: "Estimated · heart-rate regression (no device value for this session)" };
}

export function formatZoneMethod(method) {
  switch (method) {
    case "stream": return "Measured, per-second";
    default: return "No per-second telemetry";
  }
}

export function normalizedPacePower(workout) {
  const power = Number(workout?.avg_power);
  if (Number.isFinite(power) && Math.round(power) > 0) return `${Math.round(power)} W`;

  const distanceKm = Number(workout?.distance_km);
  const durationMin = Number(workout?.duration_minutes) || Number(workout?.duration_seconds) / 60;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || !Number.isFinite(durationMin) || durationMin <= 0) return "—";

  // Cycling has no meaningful running "pace", show speed (km/h) instead, never min/km.
  if (workout?.sport === "cycling") {
    const kmh = distanceKm / (durationMin / 60);
    return Number.isFinite(kmh) && kmh > 0 ? `${kmh.toFixed(1)} km/h` : "—";
  }

  const paceMinPerKm = durationMin / distanceKm;
  // Round total seconds first so 4:59.7 becomes 5:00, never "4:60".
  // Do not display a plausible pace for invalid or non-positive values.
  if (!Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) return "—";
  const totalSeconds = Math.round(paceMinPerKm * 60);
  if (totalSeconds <= 0) return "—";
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}