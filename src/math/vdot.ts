/**
 * Jack Daniels VDOT Calculation Engine
 */

export function calculateVDOT(timeSeconds: number, distanceMeters: number): number {
  if (timeSeconds <= 0 || distanceMeters <= 0) {
    throw new Error('Time and distance must be positive numbers');
  }

  // Daniels' formula loses validity for very short efforts (< ~3 min / < ~1200 m):
  // it produces inflated VDOT spikes from sprints or partial telemetry. Reject them
  // so downstream training paces and race predictions stay grounded in real endurance efforts.
  if (timeSeconds < 180 || distanceMeters < 1200) {
    throw new Error(
      'VDOT requires an effort of at least 180 seconds and 1200 meters (Daniels formula is invalid for short sprints)'
    );
  }

  const timeMinutes = timeSeconds / 60;
  const velocityMetersPerMin = distanceMeters / timeMinutes;

  const vo2Cost =
    -4.60 +
    0.182258 * velocityMetersPerMin +
    0.000104 * Math.pow(velocityMetersPerMin, 2);

  const percentMaxVo2 =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);

  const rawVdot = vo2Cost / percentMaxVo2;

  return Number(rawVdot.toFixed(2));
}

function velocityFromVO2(vo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.60 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

function velocityToSecPerKm(velocityMetersPerMin: number): number {
  return Math.round(60000 / velocityMetersPerMin);
}

function formatPace(secPerKm: number): string {
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}/km`;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.round(totalSeconds % 60);

  const pad = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  if (hours > 0) {
    return `${hours}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

export interface TrainingPaces {
  easy: { secPerKm: number; formatted: string };
  marathon: { secPerKm: number; formatted: string };
  threshold: { secPerKm: number; formatted: string };
  interval: { secPerKm: number; formatted: string };
  repetition: { secPerKm: number; formatted: string };
}

export function getTrainingPaces(vdot: number): TrainingPaces {
  if (vdot <= 0) {
    throw new Error('VDOT must be a positive number');
  }

  const easyPaceSec = velocityToSecPerKm(velocityFromVO2(vdot * 0.70));
  const marathonPaceSec = velocityToSecPerKm(velocityFromVO2(vdot * 0.84));
  const thresholdPaceSec = velocityToSecPerKm(velocityFromVO2(vdot * 0.88));
  const intervalPaceSec = velocityToSecPerKm(velocityFromVO2(vdot * 0.98));
  const repetitionPaceSec = velocityToSecPerKm(velocityFromVO2(vdot * 1.07));

  return {
    easy: { secPerKm: easyPaceSec, formatted: formatPace(easyPaceSec) },
    marathon: { secPerKm: marathonPaceSec, formatted: formatPace(marathonPaceSec) },
    threshold: { secPerKm: thresholdPaceSec, formatted: formatPace(thresholdPaceSec) },
    interval: { secPerKm: intervalPaceSec, formatted: formatPace(intervalPaceSec) },
    repetition: { secPerKm: repetitionPaceSec, formatted: formatPace(repetitionPaceSec) },
  };
}

/**
 * Solves equivalent race duration in seconds for a given distance and VDOT.
 */
function solveEquivalentTime(vdot: number, distanceMeters: number): number {
  let lowMin = 1;
  let highMin = 1000;
  let timeMin = 30;

  for (let i = 0; i < 30; i++) {
    timeMin = (lowMin + highMin) / 2;
    const v = distanceMeters / timeMin;
    const vo2Cost = -4.60 + 0.182258 * v + 0.000104 * Math.pow(v, 2);
    const pct =
      0.8 +
      0.1894393 * Math.exp(-0.012778 * timeMin) +
      0.2989558 * Math.exp(-0.1932605 * timeMin);
    const calcVdot = vo2Cost / pct;

    if (calcVdot > vdot) {
      lowMin = timeMin;
    } else {
      highMin = timeMin;
    }
  }

  return Math.round(timeMin * 60);
}

export interface EquivalentTimes {
  fiveKm: { seconds: number; formatted: string };
  tenKm: { seconds: number; formatted: string };
  halfMarathon: { seconds: number; formatted: string };
  marathon: { seconds: number; formatted: string };
}

export function getEquivalentTimes(vdot: number): EquivalentTimes {
  if (vdot <= 0) {
    throw new Error('VDOT must be a positive number');
  }

  const distances = {
    fiveKm: 5000,
    tenKm: 10000,
    halfMarathon: 21097.5,
    marathon: 42195,
  };

  return {
    fiveKm: {
      seconds: solveEquivalentTime(vdot, distances.fiveKm),
      formatted: formatDuration(solveEquivalentTime(vdot, distances.fiveKm)),
    },
    tenKm: {
      seconds: solveEquivalentTime(vdot, distances.tenKm),
      formatted: formatDuration(solveEquivalentTime(vdot, distances.tenKm)),
    },
    halfMarathon: {
      seconds: solveEquivalentTime(vdot, distances.halfMarathon),
      formatted: formatDuration(solveEquivalentTime(vdot, distances.halfMarathon)),
    },
    marathon: {
      seconds: solveEquivalentTime(vdot, distances.marathon),
      formatted: formatDuration(solveEquivalentTime(vdot, distances.marathon)),
    },
  };
}