// src/science/vdot.ts
// Jack Daniels VDOT (maximal aerobic capacity equivalent) and derived training
// paces & equivalent race times. Pure functions.
//
// Source: Daniels, J. 2013. Daniels' Running Formula (2nd ed.). Human Kinetics.
// The VO2-cost equation:
//   VO2 = -4.60 + 0.182258·v + 0.000104·v²      (v in m/min)
// and the %VO2max fraction of sustained effort:
//   %max = 0.8 + 0.1894393·e^(-0.012778·t) + 0.2989558·e^(-0.1932605·t)  (t in min)
// give VDOT = VO2 / %max.
//
// Limitations:
//  - Invalid for efforts shorter than ~3 min / 1200 m: the formula inflates VDOT
//    for sprints and partial telemetry. We reject those inputs.
//  - A single VDOT abstracts an entire performance; terrain, heat, and tactics
//    are ignored (see grade + heat adjusters).

export interface TrainingPaces {
  easy: { secPerKm: number; formatted: string };
  marathon: { secPerKm: number; formatted: string };
  threshold: { secPerKm: number; formatted: string };
  interval: { secPerKm: number; formatted: string };
  repetition: { secPerKm: number; formatted: string };
}

export interface EquivalentTimes {
  fiveKm: { seconds: number; formatted: string };
  tenKm: { seconds: number; formatted: string };
  halfMarathon: { seconds: number; formatted: string };
  marathon: { seconds: number; formatted: string };
}

export function calculateVDOT(timeSeconds: number, distanceMeters: number): number {
  if (timeSeconds <= 0 || distanceMeters <= 0) {
    throw new Error('Time and distance must be positive numbers');
  }
  if (timeSeconds < 180 || distanceMeters < 1200) {
    throw new Error('VDOT requires >= 180 s and >= 1200 m (Daniels formula invalid for short sprints)');
  }
  const timeMinutes = timeSeconds / 60;
  const v = distanceMeters / timeMinutes;
  const vo2Cost = -4.6 + 0.182258 * v + 0.000104 * Math.pow(v, 2);
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes) + 0.2989558 * Math.exp(-0.1932605 * timeMinutes);
  return Number((vo2Cost / pct).toFixed(2));
}

/** Solve the Daniels VO2-cost equation for velocity (m/min) at a target VO2. */
export function velocityFromVO2(vo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.6 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

function velocityToSecPerKm(v: number): number {
  return Math.round(60000 / v);
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}/km`;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Daniels training paces (E/M/T/I/R) for a given VDOT. */
export function getTrainingPaces(vdot: number): TrainingPaces {
  if (vdot <= 0) throw new Error('VDOT must be a positive number');
  const easy = velocityToSecPerKm(velocityFromVO2(vdot * 0.7));
  const marathon = velocityToSecPerKm(velocityFromVO2(vdot * 0.84));
  const threshold = velocityToSecPerKm(velocityFromVO2(vdot * 0.88));
  const interval = velocityToSecPerKm(velocityFromVO2(vdot * 0.98));
  const repetition = velocityToSecPerKm(velocityFromVO2(vdot * 1.07));
  return {
    easy: { secPerKm: easy, formatted: formatPace(easy) },
    marathon: { secPerKm: marathon, formatted: formatPace(marathon) },
    threshold: { secPerKm: threshold, formatted: formatPace(threshold) },
    interval: { secPerKm: interval, formatted: formatPace(interval) },
    repetition: { secPerKm: repetition, formatted: formatPace(repetition) },
  };
}

/** Solve equivalent race duration (seconds) for a distance at a given VDOT. */
export function solveEquivalentTime(vdot: number, distanceMeters: number): number {
  let lowMin = 1;
  let highMin = 1000;
  let timeMin = 30;
  for (let i = 0; i < 30; i++) {
    timeMin = (lowMin + highMin) / 2;
    const v = distanceMeters / timeMin;
    const vo2Cost = -4.6 + 0.182258 * v + 0.000104 * Math.pow(v, 2);
    const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMin) + 0.2989558 * Math.exp(-0.1932605 * timeMin);
    const calcVdot = vo2Cost / pct;
    if (calcVdot > vdot) lowMin = timeMin;
    else highMin = timeMin;
  }
  return Math.round(timeMin * 60);
}

const DISTANCES = {
  fiveKm: 5000,
  tenKm: 10000,
  halfMarathon: 21097.5,
  marathon: 42195,
};

/** Predicted equivalent race times across standard distances from a VDOT. */
export function getEquivalentTimes(vdot: number): EquivalentTimes {
  if (vdot <= 0) throw new Error('VDOT must be a positive number');
  const make = (m: number) => {
    const seconds = solveEquivalentTime(vdot, m);
    return { seconds, formatted: formatDuration(seconds) };
  };
  return {
    fiveKm: make(DISTANCES.fiveKm),
    tenKm: make(DISTANCES.tenKm),
    halfMarathon: make(DISTANCES.halfMarathon),
    marathon: make(DISTANCES.marathon),
  };
}

/** Daniels running threshold pace (m/s) from VDOT. */
export function danielsThresholdMs(vdot: number | null | undefined): number | null {
  if (!vdot || vdot <= 0) return null;
  const secPerKm = getTrainingPaces(vdot).threshold.secPerKm;
  return secPerKm > 0 ? 1000 / secPerKm : null;
}