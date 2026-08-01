// Pure helpers for the Advanced Workout Analytics detail view.

const ZONE_BOUNDARIES = [0, 0.6, 0.7, 0.8, 0.9, 2];

// Buckets time spent in each of the 5 HR zones (% of max HR).
// Uses second-by-second streams when available, otherwise estimates
// the entire session duration falls in the zone matching avg_hr.
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
  } else if (workout.avg_hr) {
    const pct = workout.avg_hr / maxHr;
    const totalSeconds = workout.duration_seconds || (workout.duration_minutes || 0) * 60 || 1;
    for (let z = 0; z < 5; z++) {
      if (pct >= ZONE_BOUNDARIES[z] && pct < ZONE_BOUNDARIES[z + 1]) {
        seconds[z] = totalSeconds;
        break;
      }
    }
  }

  const total = seconds.reduce((a, b) => a + b, 0) || 1;
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

export function normalizedPacePower(workout) {
  if (workout.avg_power) return `${Math.round(workout.avg_power)} W`;
  if (workout.distance_km && (workout.duration_minutes || workout.duration_seconds)) {
    const durationMin = workout.duration_minutes || workout.duration_seconds / 60;
    const paceMinPerKm = durationMin / workout.distance_km;
    const min = Math.floor(paceMinPerKm);
    const sec = Math.round((paceMinPerKm - min) * 60);
    return `${min}:${sec.toString().padStart(2, "0")} /km`;
  }
  return "—";
}