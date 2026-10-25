export interface TelemetryStreamPoint {
  timeOffsetSeconds: number; // seconds from start
  outputValue: number;       // power (Watts) or speed (m/s)
}

export interface WPrimeKineticsConfig {
  wPrimeCapacityJoules: number; // e.g. 20000 J (20kJ)
  criticalPowerOrSpeed: number;  // CP threshold
  tauConstant?: number; // Added 'number' type for tauConstant
}

export interface WPrimeAnalysisResult {
  timeSeconds: number;
  wPrimeBalanceJoules: number;
  depletionPercent: number;
}

/**
 * Computes second-by-second W' balance across an activity telemetry stream.
 */
export function computeWPrimeStream(
  stream: TelemetryStreamPoint[],
  config: WPrimeKineticsConfig
): WPrimeAnalysisResult[] {
  const { wPrimeCapacityJoules, criticalPowerOrSpeed, tauConstant } = config; // Destructure tauConstant
  let currentWBal = wPrimeCapacityJoules;
  const results: WPrimeAnalysisResult[] = [];

  if (stream.length === 0) return results;

    for (let i = 0; i < stream.length; i++) {
    const point = stream[i];
    const dt = i === 0 ? 0 : point.timeOffsetSeconds - stream[i - 1].timeOffsetSeconds;

    const surplusOrDeficit = point.outputValue - criticalPowerOrSpeed;

    if (surplusOrDeficit > 0) {
        // Expenditure above CP
        currentWBal -= surplusOrDeficit * Math.max(dt, 0);
        if (currentWBal < 0) currentWBal = 0; // cannot drop below zero absolute
    } else {
        // Recovery below CP (Exponential reconstitution)
        const deficit = wPrimeCapacityJoules - currentWBal;
        if (deficit > 0) {
            // Time constant tau for recovery depends on current depletion state (Skiba model)
            // Use provided tauConstant if available, otherwise calculate using Skiba's formula.
            const tau = tauConstant !== undefined ? tauConstant : (546 * Math.exp(-0.01 * Math.abs(surplusOrDeficit)) + 316);
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