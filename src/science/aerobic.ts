/**
 * Aerobic Efficiency Factor (EF) & Aerobic Decoupling Engine
 * 
 * Implements calculations for aerobic efficiency (speed or power per heart rate beat)
 * and aerobic decoupling (cardiac drift between first and second halves of endurance workouts).
 * 
 * @citation Seiler, S. (2006). What is Best Practice for Training Intensity and Duration Distribution in Endurance Athletes? Sportscience, 10, 34-53.
 * @citation Friel, J. (2009). The Triathlete's Training Bible. VeloPress.
 * @assumption Aerobic decoupling greater than 5% over steady-state endurance efforts indicates cardiovascular drift, dehydration, or glycogen depletion.
 * @limitation Requires steady-state aerobic efforts without frequent stoplights, climbs, or intense surges.
 */

/**
 * Calculates Efficiency Factor (EF) as velocity (meters per second) divided by average heart rate.
 * 
 * @citation Friel (2009) Efficiency Factor
 * @assumption Higher EF at the same heart rate reflects improved aerobic fitness and stroke volume economy.
 */
export function calculateEfficiencyFactor(avgSpeedMetersPerSec: number, avgHeartRate: number): number {
  if (!avgHeartRate || avgHeartRate <= 0 || avgSpeedMetersPerSec <= 0) return 0;
  return Number((avgSpeedMetersPerSec / avgHeartRate).toFixed(4));
}

/**
 * Calculates Aerobic Decoupling (Pa:Hr drift percentage) between first and second halves of a workout.
 * 
 * @citation Seiler (2006); Friel (2009)
 * @assumption Pacing and heart rate ratio should remain stable in true aerobic steady-state efforts. Drift > 5% indicates onset of fatigue or thermal stress.
 */
export function calculateAerobicDecoupling(
  firstHalfEfficiency: number,
  secondHalfEfficiency: number
): number {
  if (!firstHalfEfficiency || firstHalfEfficiency <= 0 || !secondHalfEfficiency || secondHalfEfficiency <= 0) {
    return 0;
  }
  // Decoupling percentage = (1 - (secondHalfEfficiency / firstHalfEfficiency)) * 100
  // Note: Efficiency drops (lower speed/HR ratio) in the second half due to cardiac drift.
  const decoupling = (1 - secondHalfEfficiency / firstHalfEfficiency) * 100;
  return Number(decoupling.toFixed(2));
}
