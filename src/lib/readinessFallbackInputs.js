// Adapt stored daily measurements to the deterministic readiness function's contract.
// Do not coerce missing or non-numeric provider values into measured signals.
const finite = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;

function meanMeasured(rows, key) {
  const samples = (Array.isArray(rows) ? rows : [])
    .map((row) => finite(row?.[key]))
    .filter((value) => value !== null && value > 0);
  return samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : null;
}

export function readinessFallbackInputs(today, telemetry) {
  if (!today) return null;
  const tsb = finite(today.calculated_tsb);
  return {
    current: {
      hrvMs: finite(today.hrv),
      sleepScore: finite(today.sleep_score),
      restingHr: finite(today.resting_hr),
      stressScore: finite(today.stress_score),
      bodyBattery: finite(today.body_battery),
    },
    baseline: {
      hrvMean: meanMeasured(telemetry, "hrv_ms"),
      restingHrMean: meanMeasured(telemetry, "resting_hr"),
    },
    tsb,
  };
}
