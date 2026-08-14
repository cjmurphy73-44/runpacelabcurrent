/**
 * Jack Daniels VDOT Calculation Engine
 *
 * VDOT is a pseudo-VO2 max metric combining oxygen consumption capacity
 * with running economy based on race performance rather than laboratory tests.
 */

/**
 * Calculates Jack Daniels' VDOT value based on race duration and distance.
 *
 * @param timeSeconds - Total race duration in seconds (must be > 0)
 * @param distanceMeters - Total race distance in meters (must be > 0)
 * @returns Calculated VDOT score rounded to two decimal places
 * @throws Error if inputs are non-positive
 */
export function calculateVDOT(timeSeconds: number, distanceMeters: number): number {
  if (timeSeconds <= 0 || distanceMeters <= 0) {
    throw new Error('Time and distance must be positive numbers');
  }

  // Convert time to minutes and velocity to meters/minute
  const timeMinutes = timeSeconds / 60;
  const velocityMetersPerMin = distanceMeters / timeMinutes;

  // 1. Oxygen Cost Equation (VO2 in ml/kg/min for a given running velocity v)
  // VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
  const vo2Cost =
    -4.60 +
    0.182258 * velocityMetersPerMin +
    0.000104 * Math.pow(velocityMetersPerMin, 2);

  // 2. Percent Max Oxygen Consumption (%VO2max sustained over duration t in minutes)
  // %VO2max = 0.8 + 0.1894393 * e^(-0.012778 * t) + 0.2989558 * e^(-0.1932605 * t)
  const percentMaxVo2 =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);

  // 3. VDOT = Oxygen Cost / Sustained Percent Max
  const rawVdot = vo2Cost / percentMaxVo2;

  // Round to 2 decimal places
  return Number(rawVdot.toFixed(2));
}
