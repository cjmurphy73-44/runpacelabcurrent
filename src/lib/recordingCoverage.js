// Elapsed-time coverage of samples persisted on WorkoutSession.
// Only adjacent timestamps <=5s count as recorded time. This is not
// sensor-channel completeness or proof the original FIT file is retained.
export function recordingCoverage(session) {
  const points = session?.streams;
  const precise = Number(session?.duration_seconds);
  const minutes = Number(session?.duration_minutes);
  const duration = Number.isFinite(precise) && precise > 0
    ? precise : Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 0;
  if (!Array.isArray(points) || points.length < 2 || duration <= 0) return null;

  let previous = -Infinity;
  let covered = 0;
  for (const point of points) {
    const time = Number(point?.time);
    if (!Number.isFinite(time) || time < 0 || time <= previous) return null;
    if (previous !== -Infinity) {
      const dt = time - previous;
      // Missing minutes cannot be inferred from surrounding samples.
      if (dt <= 5) covered += dt;
    }
    previous = time;
  }
  const savedSeconds = Math.min(covered, duration);
  const ratio = Math.min(1, savedSeconds / duration);
  return {
    totalSeconds: duration,
    savedSeconds,
    percent: Math.round(ratio * 100),
    partial: ratio < 0.95,
    sampleCount: points.length,
  };
}
