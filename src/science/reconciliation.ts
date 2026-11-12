/**
 * Telemetry reconciliation: explicit status, no fabricated samples or timestamps.
 * Mismatched channels must not masquerade as a synchronized measurement.
 */
export interface TelemetryPoint {
  power: number;
  hr: number;
  ts: number;
}

export interface ReconciledStream {
  alignedPoints: TelemetryPoint[];
  status: 'synchronized' | 'pending' | 'error';
}

export function reconcileTelemetryStream(data: {
  power: number[];
  hr: number[];
  timestamps: number[];
}): ReconciledStream {
  const power = data?.power;
  const hr = data?.hr;
  const timestamps = data?.timestamps;
  if (!Array.isArray(power) || !Array.isArray(hr) || !Array.isArray(timestamps)) {
    return { alignedPoints: [], status: 'error' };
  }
  if (power.length === 0 && hr.length === 0 && timestamps.length === 0) {
    return { alignedPoints: [], status: 'pending' };
  }
  if (!power.length || power.length !== hr.length || power.length !== timestamps.length) {
    return { alignedPoints: [], status: 'error' };
  }

  let lastTime = -Infinity;
  const alignedPoints: TelemetryPoint[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i];
    const p = power[i];
    const heartRate = hr[i];
    if (!Number.isFinite(ts) || ts <= lastTime || !Number.isFinite(p) ||
        !Number.isFinite(heartRate) || p < 0 || heartRate < 0) {
      return { alignedPoints: [], status: 'error' };
    }
    lastTime = ts;
    alignedPoints.push({ power: p, hr: heartRate, ts });
  }
  return { alignedPoints, status: 'synchronized' };
}
