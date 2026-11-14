// Verified recording gate for stream-dependent analyses. Summary-shaped exports
// are never counted as measured zone time, decoupling, or efficiency data.
// Keep these evidence requirements aligned with base44/shared/streamValidity.ts.
export function hasVerifiedStreams(session) {
  const stream = session?.streams;
  if (!Array.isArray(stream) || stream.length < 60) return false;

  const durationSeconds =
    Number(session?.duration_seconds) || (Number(session?.duration_minutes) || 0) * 60;
  let previous = -Infinity;
  let withHr = 0;
  let withPower = 0;

  for (const point of stream) {
    const time = Number(point?.time);
    if (!Number.isFinite(time) || time <= previous) return false;
    previous = time;
    if (typeof point?.heart_rate === 'number' && Number.isFinite(point.heart_rate) && point.heart_rate > 0) withHr += 1;
    if (typeof point?.power === 'number' && Number.isFinite(point.power) && point.power > 0) withPower += 1;
  }

  const span = Number(stream[stream.length - 1].time) - Number(stream[0].time);
  if (span < 60 || !Number.isFinite(span)) return false;
  // Reject sparse points spread across an activity. They are not a dense stream.
  if (span / (stream.length - 1) > 5) return false;
  if (durationSeconds > 0 && (span < durationSeconds * 0.6 || span > durationSeconds * 1.5 + 300)) return false;

  // A mixture of sparse HR and power does not constitute one usable channel.
  return withHr >= stream.length * 0.5 || withPower >= stream.length * 0.5;
}

// Workouts without verified streams remain visible but cannot claim
// recording-derived physiology or zone measurements.
export function analyticsEligible(session) {
  return hasVerifiedStreams(session);
}
