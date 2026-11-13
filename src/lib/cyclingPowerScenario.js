// Transparent, non-calibrated steady-state road-power scenario.
// NOT measured power, actual ride-average power, normalized power, or FTP.
export function cyclingPowerScenario({
  speedKmh, riderMassKg, bikeMassKg = 10, cda = 0.32,
  crr = 0.005, airDensity = 1.225, headwindKmh = 0,
  gradePercent = 0, drivetrainEfficiency = 0.975,
}) {
  const values = [speedKmh,riderMassKg,bikeMassKg,cda,crr,airDensity,headwindKmh,gradePercent,drivetrainEfficiency];
  if (!values.every(v => typeof v === "number" && Number.isFinite(v))) return null;
  if (speedKmh <= 0 || speedKmh > 100 || riderMassKg < 25 || riderMassKg > 250
    || bikeMassKg < 3 || bikeMassKg > 35 || cda < 0.15 || cda > 0.9
    || crr < 0.001 || crr > 0.03 || airDensity < 0.8 || airDensity > 1.5
    || headwindKmh < -45 || headwindKmh > 45 || gradePercent < -20 || gradePercent > 20
    || drivetrainEfficiency < 0.75 || drivetrainEfficiency > 1) return null;

  const v = speedKmh / 3.6;
  const relativeAirSpeed = v + headwindKmh / 3.6;
  const mass = riderMassKg + bikeMassKg;
  const slope = Math.atan(gradePercent / 100);
  const drag = 0.5 * airDensity * cda * relativeAirSpeed * Math.abs(relativeAirSpeed);
  const rolling = mass * 9.80665 * Math.cos(slope) * crr;
  const gravity = mass * 9.80665 * Math.sin(slope);
  const crankPower = Math.max(0, (drag + rolling + gravity) * v / drivetrainEfficiency);
  return { watts: Math.round(crankPower), basis: "steady-speed, constant-grade physics scenario" };
}
