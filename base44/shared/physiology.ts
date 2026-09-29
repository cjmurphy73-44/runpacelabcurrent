export function calculateVDOTScore(timeSeconds: number, distanceMeters: number): number {
  const t = timeSeconds / 60;
  const velocity = distanceMeters / t;
  const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);
  const vdot = vo2 / percentMax;
  return Math.round(vdot * 10) / 10;
}

export function calculateThresholdPace(vdot: number): { thresholdSecondsPerKm: number } {
  const speedMetersPerMin = 29.54 + 5.000663 * vdot - 0.007546 * Math.pow(vdot, 2);
  const secondsPerKm = (1000 / speedMetersPerMin) * 60;
  return { thresholdSecondsPerKm: Math.round(secondsPerKm) };
}

export function calculateMinettiGradePace(basePaceSecondsPerKm: number, gradePercent: number): number {
  const g = gradePercent / 100;
  const costMultiplier = 155.4 * Math.pow(g, 5) - 30.4 * Math.pow(g, 4) - 43.3 * Math.pow(g, 3) + 46.3 * Math.pow(g, 2) + 19.5 * g + 1.0;
  return Math.round(basePaceSecondsPerKm * Math.max(0.5, 1 / costMultiplier));
}
