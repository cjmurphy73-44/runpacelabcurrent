export interface TelemetryStreamPoint {
  timeOffsetSeconds: number;
  outputValue: number;
}

export interface WPrimeKineticsConfig {
  wPrimeCapacityJoules: number;
  criticalPowerOrSpeed: number;
}

export interface WPrimeAnalysisResult {
  timeSeconds: number;
  wPrimeBalanceJoules: number;
  depletionPercent: number;
}

export function computeWPrimeStream(
  stream: TelemetryStreamPoint[],
  config: WPrimeKineticsConfig
): WPrimeAnalysisResult[] {
  const { wPrimeCapacityJoules, criticalPowerOrSpeed } = config;
  let currentWBal = wPrimeCapacityJoules;
  const results: WPrimeAnalysisResult[] = [];

  if (stream.length === 0) return results;

  let lastTime = stream[0].timeOffsetSeconds;

  for (const point of stream) {
    const dt = point.timeOffsetSeconds - lastTime;
    lastTime = point.timeOffsetSeconds;

    const surplusOrDeficit = point.outputValue - criticalPowerOrSpeed;

    if (surplusOrDeficit > 0) {
      currentWBal -= surplusOrDeficit * Math.max(dt, 0);
      if (currentWBal < 0) currentWBal = 0;
    } else {
      const deficit = wPrimeCapacityJoules - currentWBal;
      if (deficit > 0) {
        const tau = 546 * Math.exp(-0.01 * Math.abs(surplusOrDeficit)) + 316;
        const recovery = deficit * (1 - Math.exp(-dt / tau));
        currentWBal += recovery;
        if (currentWBal > wPrimeCapacityJoules) {
          currentWBal = wPrimeCapacityJoules;
        }
      }
    }

    const depletionPercent = Number((((wPrimeCapacityJoules - currentWBal) / wPrimeCapacityJoules) * 100).toFixed(1));

    results.push({
      timeSeconds: point.timeOffsetSeconds,
      wPrimeBalanceJoules: Math.round(currentWBal),
      depletionPercent
    });
  }

  return results;
}
