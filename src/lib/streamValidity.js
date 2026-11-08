// One authoritative rule for "does this session have real per-second telemetry?".
// Everything that shows or computes zone time, efficiency factor, decoupling or
// stream-derived charts reads this, so a summary-only import can never be presented
// as measured data again.
//
// A stored stream counts as verified only when it is dense enough to be a real
// recording: enough samples, a span that matches the session, and at least half of
// those samples carrying an actual heart rate or power reading. A handful of
// points reconstructed from an activity summary fails every one of those tests.

export function hasVerifiedStreams(session) {
  const stream = session?.streams;
  if (!Array.isArray(stream) || stream.length < 30) return false;

  const first = stream[0] || {};
  const last = stream[stream.length - 1] || {};
  const span = Number(last.time) - Number(first.time);
  if (!Number.isFinite(span) || span < 60) return false;

  const durationSeconds =
    Number(session?.duration_seconds) || (Number(session?.duration_minutes) || 0) * 60;
  if (durationSeconds > 0 && span < durationSeconds * 0.6) return false;

  let measured = 0;
  for (const point of stream) {
    if (Number(point?.heart_rate) > 0 || Number(point?.power) > 0) measured += 1;
  }
  return measured >= stream.length * 0.5;
}

// Sessions without verified streams stay visible as workouts but sit outside every
// stream-dependent model, chart and insight.
export function analyticsEligible(session) {
  return hasVerifiedStreams(session);
}