export interface TelemetryPoint {
  timestamp: number;
  heartRate?: number;
  power?: number;
  [key: string]: any;
}

export function sanitizeTelemetryStream(stream: TelemetryPoint[]): TelemetryPoint[] {
  if (!stream || stream.length === 0) return [];

  const seen = new Set<number>();
  const sanitized: TelemetryPoint[] = [];

  for (const pt of stream) {
    if (seen.has(pt.timestamp)) continue;
    seen.add(pt.timestamp);

    const clamped: TelemetryPoint = { ...pt };
    if (typeof clamped.heartRate === 'number') {
      clamped.heartRate = Math.min(Math.max(clamped.heartRate, 0), 250);
    }
    if (typeof clamped.power === 'number') {
      clamped.power = Math.min(Math.max(clamped.power, 0), 2000);
    }
    sanitized.push(clamped);
  }

  return sanitized.sort((a, b) => a.timestamp - b.timestamp);
}

export function reconcileStreams(streams: Record<string, TelemetryPoint[]>): TelemetryPoint[] {
  const allStreams = Object.values(streams).filter(Boolean);
  if (allStreams.length === 0) return [];

  // Flatten and sanitize each stream
  const cleanedStreams = allStreams.map(s => sanitizeTelemetryStream(s));
  
  // Find global min and max timestamps
  let minTs = Infinity;
  let maxTs = -Infinity;

  for (const stream of cleanedStreams) {
    for (const pt of stream) {
      if (pt.timestamp < minTs) minTs = pt.timestamp;
      if (pt.timestamp > maxTs) maxTs = pt.timestamp;
    }
  }

  if (minTs === Infinity || maxTs === -Infinity) return [];

  const durationSeconds = maxTs - minTs;
  if (durationSeconds > 86400) {
    throw new Error('Telemetry stream duration exceeds maximum allowed window (> 24 hours)');
  }

  // Build maps for each stream for interpolation
  const streamMaps = cleanedStreams.map(stream => {
    const map = new Map<number, TelemetryPoint>();
    for (const pt of stream) {
      map.set(pt.timestamp, pt);
    }
    return {
      stream,
      map,
      timestamps: stream.map(s => s.timestamp).sort((a, b) => a - b)
    };
  });

  const unified: TelemetryPoint[] = [];

  for (let t = minTs; t <= maxTs; t++) {
    const point: TelemetryPoint = { timestamp: t };

    for (const { stream, map, timestamps } of streamMaps) {
      if (map.has(t)) {
        Object.assign(point, map.get(t));
      } else {
        // Linear interpolation between surrounding points
        let lower = timestamps[0];
        let upper = timestamps[timestamps.length - 1];

        for (let i = 0; i < timestamps.length - 1; i++) {
          if (timestamps[i] <= t && timestamps[i + 1] >= t) {
            lower = timestamps[i];
            upper = timestamps[i + 1];
            break;
          }
        }

        if (lower !== upper && t >= lower && t <= upper) {
          const pLower = map.get(lower)!;
          const pUpper = map.get(upper)!;
          const fraction = (t - lower) / (upper - lower);

          for (const key of Object.keys(pLower)) {
            if (key === 'timestamp') continue;
            const valLower = pLower[key];
            const valUpper = pUpper[key];
            if (typeof valLower === 'number' && typeof valUpper === 'number') {
              point[key] = Math.round((valLower + (valUpper - valLower) * fraction) * 100) / 100;
            }
          }
        }
      }
    }

    unified.push(point);
  }

  return unified;
}
