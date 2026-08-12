/**
 * Calculate thermal penalty based on temperature (C) and dew point (C).
 * Penalty is 0% if Heat Score <= 100.
 */
export const calculateThermalPenalty = (tempC: number, dewPointC: number): number => {
  if (typeof tempC !== 'number' || isNaN(tempC) || typeof dewPointC !== 'number' || isNaN(dewPointC)) {
    return 0;
  }

  const heatScore = tempC + dewPointC;
  if (heatScore <= 100) return 0;

  // Simple linear penalty: 0.5% per point above 100
  return (heatScore - 100) * 0.005;
};
