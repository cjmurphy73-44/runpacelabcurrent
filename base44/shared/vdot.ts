// base44/shared/vdot.ts
// Jack Daniels VDOT engine — backend-authoritative port of src/science/vdot.ts.
// Pure functions, shared by the AI plan/strategy functions so training paces,
// equivalent race times, and the Daniels threshold pace are computed
// server-side from the athlete's VDOT rather than trusted from a client-stored
// value or guessed by the LLM.
//
// Source: Daniels, J. 2013. Daniels' Running Formula (2nd ed.). Human Kinetics.
//   VO2 = -4.60 + 0.182258·v + 0.000104·v²          (v in m/min)
//   %max = 0.8 + 0.1894393·e^(-0.012778·t) + 0.2989558·e^(-0.1932605·t)  (t in min)
//   VDOT = VO2 / %max
//
// Invalid for efforts < ~3 min / 1200 m (inflates VDOT for sprints); rejected.

export function calculateVDOT(timeSeconds, distanceMeters) {
  if (timeSeconds <= 0 || distanceMeters <= 0) throw new Error('Time and distance must be positive numbers');
  if (timeSeconds < 180 || distanceMeters < 1200) throw new Error('VDOT requires >= 180 s and >= 1200 m');
  const timeMinutes = timeSeconds / 60;
  const v = distanceMeters / timeMinutes;
  const vo2Cost = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes) + 0.2989558 * Math.exp(-0.1932605 * timeMinutes);
  return Number((vo2Cost / pct).toFixed(2));
}

/** Solve the Daniels VO2-cost equation for velocity (m/min) at a target VO2. */
export function velocityFromVO2(vo2) {
  const a = 0.000104, b = 0.182258, c = -(4.6 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

function velocityToSecPerKm(v) { return Math.round(60000 / v); }

function formatPace(secPerKm) {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}/km`;
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Daniels training paces (E/M/T/I/R) for a given VDOT. */
export function getTrainingPaces(vdot) {
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
export function solveEquivalentTime(vdot, distanceMeters) {
  let lowMin = 1, highMin = 1000, timeMin = 30;
  for (let i = 0; i < 30; i++) {
    timeMin = (lowMin + highMin) / 2;
    const v = distanceMeters / timeMin;
    const vo2Cost = -4.6 + 0.182258 * v + 0.000104 * v * v;
    const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMin) + 0.2989558 * Math.exp(-0.1932605 * timeMin);
    if (vo2Cost / pct > vdot) lowMin = timeMin;
    else highMin = timeMin;
  }
  return Math.round(timeMin * 60);
}

const DISTANCES = { fiveKm: 5000, tenKm: 10000, halfMarathon: 21097.5, marathon: 42195 };

/** Predicted equivalent race times across standard distances from a VDOT. */
export function getEquivalentTimes(vdot) {
  if (vdot <= 0) throw new Error('VDOT must be a positive number');
  const make = (m) => { const seconds = solveEquivalentTime(vdot, m); return { seconds, formatted: formatDuration(seconds) }; };
  return {
    fiveKm: make(DISTANCES.fiveKm),
    tenKm: make(DISTANCES.tenKm),
    halfMarathon: make(DISTANCES.halfMarathon),
    marathon: make(DISTANCES.marathon),
  };
}

/** Daniels running threshold pace (m/s) from VDOT. */
export function danielsThresholdMs(vdot) {
  if (!vdot || vdot <= 0) return null;
  const secPerKm = getTrainingPaces(vdot).threshold.secPerKm;
  return secPerKm > 0 ? 1000 / secPerKm : null;
}

/** Format a pace in m/s as a m:ss/km string (no trailing /km). */
export function formatPaceFromMs(paceMs) {
  if (!paceMs || paceMs <= 0) return null;
  const secPerKm = 1000 / paceMs;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}