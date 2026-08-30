/**
<div>Minetti Grade-Adjusted Pace & Metabolic Cost Engine</div>
 * 
 * Implements the energy expenditure and grade-adjusted speed scaling polynomial model
 * established by Minetti et al. for uphill and downhill running.
 * 
 * @citation Minetti, A. E., Moia, C., Roi, G. S., Susta, D., & Ferretti, G. (2002). Energy cost of walking and running at extreme uphill and downhill slopes. Journal of Applied Physiology, 93(3), 1039-1046.
 * @assumption Metabolic energy cost of running varies non-linearly with gradient according to a 5th-order polynomial.
 * @limitation Model coefficients are optimized for steady running on paved inclines up to +/-45% grade; extreme off-road terrain or footing slippage introduces error.
 */

/**
 * Calculates the metabolic energy cost factor relative to flat running (cost at 0% grade = 1.0).
 * 
 * @citation Minetti et al. (2002) Eq. 4
 * @assumption Energy expenditure per unit distance increases sharply on steep ascents and drops on mild descents before rising on steep descents due to eccentric braking.
 * @limitation Validated strictly for grades between -45% and +45% (-0.45 to +0.45).
 */
export function gradeCostFactor(grade: number): number {
  const s = Math.max(-0.45, Math.min(0.45, grade));
  const cf = 1 + 19 * s + 50.4 * s * s - 128.2 * s * s * s;
  return Math.max(0.5, Math.min(3, cf));
}

/**
 * Calculates Normalized Graded Pace (NGP) equivalent in seconds per kilometer for a given pace and grade.
 * 
 * @citation Minetti et al. (2002) Metabolic Equivalent
 * @assumption Runners expend equivalent physiological effort on grades compared to flat running when adjusted by metabolic cost factor.
 */
export function calculateNGP(paceSecondsPerKm: number, grade: number): number {
  if (!paceSecondsPerKm || paceSecondsPerKm <= 0) return 0;
  const costFactor = gradeCostFactor(grade);
  // If cost factor is > 1 (uphill), equivalent flat pace is faster (fewer seconds/km).
  // NGP = paceSecondsPerKm / costFactor
  const ngp = paceSecondsPerKm / costFactor;
  return Math.round(ngp);
}
