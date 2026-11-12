// Verified recording gate for stream-dependent analyses. Summary-shaped exports
// are never counted as measured zone time, decoupling, or efficiency data.
// Keep these evidence requirements aligned with base44/shared/streamValidity.ts.
export function hasVerifiedStreams(session) {
  const stream = session?.streams;
  if (!Array.isArray(stream) || stream.length < 60) return false;

  const durationSeconds =
    Number(session?.duration_seconds) || (Number(session?.duration_minutes) || 0) * 60;
  let previous = -Infinity;
  let measured = 0;

  for (const point of stream) {
    const time = Number(point?.time);
    if (!Number.isFinite(time) || time <= previous) return false;
    previous = time;
    const hr = Number(point?.heart_rate);
    const power = Number(point?.power);
    if ((Number.isFinite(hr) && hr > 0) || (Number.isFinite(power) && power > 0)) {
      measured += 1;
    }
  }

  const span = Number(stream[stream.length - 1].time) - Number(stream[0].time);
  if (span < 60 || !Number.isFinite(span)) return false;
  // Reject sparse points spread across an activity. They are not a dense stream.
  if (span / (stream.length - 1) > 5) return false;
  if (durationSeconds > 0 && (span < durationSeconds * 0.6 || span > durationSeconds * 1.5 + 300)) return false;

  return measured >= stream.length * 0.5;
}

// Workouts without verified streams remain visible but cannot claim
// recording-derived physiology or zone measurements.
export function analyticsEligible(session) {
  return hasVerifiedStreams(session);
}
