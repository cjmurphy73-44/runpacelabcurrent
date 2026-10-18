import { computeWPrimeStream, TelemetryStreamPoint, WPrimeAnalysisResult } from '../science';

export interface ProcessedActivityStreams {
  wPrimeAnalysis: WPrimeAnalysisResult[];
  maxDepletionPercent: number;
}

/**
 * Processes incoming raw activity streams and runs physiological kinetics engines.
 */
export function processActivityStreams(
  streamPoints: TelemetryStreamPoint[],
  criticalPower: number = 300,
  wPrimeCapacity: number = 20000
): ProcessedActivityStreams {
  if (!streamPoints || streamPoints.length === 0) {
    return { wPrimeAnalysis: [], maxDepletionPercent: 0 };
  }

  const wPrimeAnalysis = computeWPrimeStream(streamPoints, {
    wPrimeCapacityJoules: wPrimeCapacity,
    criticalPowerOrSpeed: criticalPower
  });

  const maxDepletionPercent = wPrimeAnalysis.reduce(
    (max, curr) => Math.max(max, curr.depletionPercent),
    0
  );

  return {
    wPrimeAnalysis,
    maxDepletionPercent
  };
}
