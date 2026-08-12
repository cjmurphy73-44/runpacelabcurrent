/**
 * Minetti energy expenditure equation for grade-adjusted pace.
 * Formula: 155.4g^5 - 30.4g^4 - 43.3g^3 + 46.3g^2 + 19.5g + 3.6
 * Validated range: -0.12 (downhill) to +0.40 (uphill)
 */
export const calculateMinettiEnergy = (grade: number): number => {
  if (typeof grade !== 'number' || isNaN(grade)) return 3.6; // Flat pace energy cost

  // Clamp constraints
  const clampedGrade = Math.max(-0.12, Math.min(0.40, grade));
  
  const g = clampedGrade;
  return 155.4 * Math.pow(g, 5) - 30.4 * Math.pow(g, 4) - 43.3 * Math.pow(g, 3) + 46.3 * Math.pow(g, 2) + 19.5 * g + 3.6;
};
