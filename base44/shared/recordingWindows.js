// Elapsed-time coverage of stored samples.
// Only adjacent timestamps <=5s count as recorded time. This is not
// sensor-channel completeness or proof the original FIT file is retained.
export function summarizeRecordingCoverage(session) {
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

// Read-only fixed-duration windows, not device-defined laps. Never invent
// samples or interpolate across long recording gaps. Distance is cumulative
// metres in the persisted FIT/TCX stream, not kilometres.
export function summarizeRecordingWindows(stream, intervalSeconds = 600) {
  if (!Array.isArray(stream) || stream.length < 2 || ![300, 600].includes(intervalSeconds)) return [];
  const start = Number(stream[0].time);
  const end = Number(stream[stream.length - 1].time);
  const bucketCount = Math.ceil((end - start) / intervalSeconds);
  if (bucketCount <= 0 || bucketCount > 288) return [];
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    index, startSeconds: index * intervalSeconds,
    durationSeconds: Math.min(intervalSeconds, end - start - index * intervalSeconds),
    hrWeighted: 0, hrSeconds: 0, distanceMeters: 0, distanceSeconds: 0,
    speedWeighted: 0, speedSeconds: 0, powerWeighted: 0, powerSeconds: 0,
  }));
  for (let i = 1; i < stream.length; i++) {
    const a = stream[i - 1], b = stream[i];
    const t0 = Number(a.time) - start, t1 = Number(b.time) - start;
    const dt = t1 - t0;
    if (!Number.isFinite(dt) || dt <= 0 || dt > 10) continue;
    const hr = Number(b.heart_rate);
    const validHr = b.heart_rate != null && Number.isFinite(hr) && hr >= 30 && hr <= 250;
    const v = Number(b.speed);
    const validSpeed = b.speed != null && Number.isFinite(v) && v >= 0 && v <= 35;
    const power = b.power;
    const validPower = Number.isFinite(power) && power >= 0 && power <= 2500;
    const d0 = Number(a.distance), d1 = Number(b.distance);
    const validDistance = a.distance != null && b.distance != null &&
      Number.isFinite(d0) && Number.isFinite(d1) &&
      d1 >= d0 && d1 - d0 <= dt * 35;
    const first = Math.max(0, Math.floor(t0 / intervalSeconds));
    const last = Math.min(bucketCount - 1, Math.floor((t1 - Number.EPSILON) / intervalSeconds));
    for (let index = first; index <= last; index++) {
      const begin = Math.max(t0, index * intervalSeconds);
      const finish = Math.min(t1, (index + 1) * intervalSeconds);
      const overlap = finish - begin;
      if (overlap <= 0) continue;
      const bucket = buckets[index];
      if (validHr) { bucket.hrWeighted += hr * overlap; bucket.hrSeconds += overlap; }
      if (validPower) { bucket.powerWeighted += power * overlap; bucket.powerSeconds += overlap; }
      if (validSpeed) { bucket.speedWeighted += v * overlap; bucket.speedSeconds += overlap; }
      if (validDistance) {
        bucket.distanceMeters += (d1 - d0) * overlap / dt;
        bucket.distanceSeconds += overlap;
      }
    }
  }
  return buckets.map(b => ({
    index: b.index + 1,
    startSeconds: b.startSeconds,
    durationSeconds: b.durationSeconds,
    hrCoverage: b.durationSeconds ? b.hrSeconds / b.durationSeconds : 0,
    avgHr: b.hrSeconds >= b.durationSeconds * 0.8 && b.durationSeconds > 0
      ? Math.round(b.hrWeighted / b.hrSeconds) : null,
    avgPowerWatts: b.powerSeconds >= b.durationSeconds * 0.8 && b.durationSeconds > 0
      ? Math.round(b.powerWeighted / b.powerSeconds) : null,
    distanceKm: b.distanceSeconds >= b.durationSeconds * 0.8 && b.durationSeconds > 0
      ? Math.round(b.distanceMeters / 10) / 100 : null,
    avgSpeedKmh: b.distanceSeconds >= b.durationSeconds * 0.8 && b.durationSeconds > 0
      ? Math.round((b.distanceMeters / b.durationSeconds) * 360) / 100
      : b.speedSeconds >= b.durationSeconds * 0.8 && b.durationSeconds > 0
        ? Math.round((b.speedWeighted / b.speedSeconds) * 360) / 100 : null,
  }));
}
