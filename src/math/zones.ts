/**
 * Daniels VDOT Pace & Zone Generator Engine
 */

export interface PaceZone {
  name: 'EASY' | 'MARATHON' | 'THRESHOLD' | 'INTERVAL' | 'REPETITION';
  minPaceSecondsPerKm: number;
  maxPaceSecondsPerKm: number;
  targetPaceSecondsPerKm: number;
  formattedTargetPace: string;
}

export interface TrainingZonesResult {
  vdot: number;
  zones: Record<'easy' | 'marathon' | 'threshold' | 'interval' | 'repetition', PaceZone>;
}

export interface HeartRateZone {
  name: string;
  minBpm: number;
  maxBpm: number;
}

export interface HeartRateZonesResult {
  method: 'karvonen' | 'percent_max';
  zone1: HeartRateZone; // Easy / Active Recovery
  zone2: HeartRateZone; // Aerobic / Endurance
  zone3: HeartRateZone; // Tempo / Lactate Threshold
  zone4: HeartRateZone; // Anaerobic / VO2 Max
  zone5: HeartRateZone; // Neuromuscular / Speed
}

export function formatPace(paceSecondsPerKm: number): string {
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.round(paceSecondsPerKm % 60);
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mins}:${paddedSecs} /km`;
}

export function getVelocityFromVO2(vo2: number): number {
  const a = 0.000193;
  const b = 0.2;
  const c = -(vo2 + 29.28);

  return (-b + Math.sqrt(Math.pow(b, 2) - 4 * a * c)) / (2 * a);
}

/**
 * Calculates 5-zone Heart Rate ranges using Karvonen (HR Reserve) or % Max HR.
 */
export function calculateHeartRateZones(maxHr: number, restingHr?: number): HeartRateZonesResult {
  if (maxHr <= 0) {
    throw new Error('maxHr must be a positive number');
  }

  const isKarvonen = restingHr !== undefined && restingHr > 0;
  const hrr = isKarvonen ? maxHr - restingHr : maxHr;

  const getBpm = (pct: number) => {
    return isKarvonen ? Math.round(restingHr + pct * hrr) : Math.round(pct * maxHr);
  };

  return {
    method: isKarvonen ? 'karvonen' : 'percent_max',
    zone1: { name: 'Active Recovery', minBpm: getBpm(0.50), maxBpm: getBpm(0.60) },
    zone2: { name: 'Aerobic / Endurance', minBpm: getBpm(0.60), maxBpm: getBpm(0.70) },
    zone3: { name: 'Tempo / Threshold', minBpm: getBpm(0.70), maxBpm: getBpm(0.80) },
    zone4: { name: 'Anaerobic Capacity', minBpm: getBpm(0.80), maxBpm: getBpm(0.90) },
    zone5: { name: 'Neuromuscular / Speed', minBpm: getBpm(0.90), maxBpm: maxHr },
  };
}

export function generateTrainingZones(vdot: number): TrainingZonesResult {
  if (vdot <= 0 || isNaN(vdot)) {
    throw new Error('VDOT must be a positive number');
  }

  const easyVO2 = vdot * 0.52;
  const easyMinVO2 = vdot * 0.55;
  const easyMaxVO2 = vdot * 0.48;

  const marathonVO2 = vdot * 0.58;
  const thresholdVO2 = vdot * 0.637;
  const intervalVO2 = vdot * 0.71;
  const repetitionVO2 = vdot * 0.77;

  const easyTargetPace = (1000 / getVelocityFromVO2(easyVO2)) * 60;
  const easyMinPace = (1000 / getVelocityFromVO2(easyMinVO2)) * 60;
  const easyMaxPace = (1000 / getVelocityFromVO2(easyMaxVO2)) * 60;

  const marathonPace = (1000 / getVelocityFromVO2(marathonVO2)) * 60;
  const thresholdPace = (1000 / getVelocityFromVO2(thresholdVO2)) * 60;
  const intervalPace = (1000 / getVelocityFromVO2(intervalVO2)) * 60;
  const repetitionPace = (1000 / getVelocityFromVO2(repetitionVO2)) * 60;

  return {
    vdot,
    zones: {
      easy: {
        name: 'EASY',
        minPaceSecondsPerKm: Math.round(easyMinPace),
        maxPaceSecondsPerKm: Math.round(easyMaxPace),
        targetPaceSecondsPerKm: Math.round(easyTargetPace),
        formattedTargetPace: formatPace(easyTargetPace),
      },
      marathon: {
        name: 'MARATHON',
        minPaceSecondsPerKm: Math.round(marathonPace - 4),
        maxPaceSecondsPerKm: Math.round(marathonPace + 4),
        targetPaceSecondsPerKm: Math.round(marathonPace),
        formattedTargetPace: formatPace(marathonPace),
      },
      threshold: {
        name: 'THRESHOLD',
        minPaceSecondsPerKm: Math.round(thresholdPace - 4),
        maxPaceSecondsPerKm: Math.round(thresholdPace + 4),
        targetPaceSecondsPerKm: Math.round(thresholdPace),
        formattedTargetPace: formatPace(thresholdPace),
      },
      interval: {
        name: 'INTERVAL',
        minPaceSecondsPerKm: Math.round(intervalPace - 3),
        maxPaceSecondsPerKm: Math.round(intervalPace + 3),
        targetPaceSecondsPerKm: Math.round(intervalPace),
        formattedTargetPace: formatPace(intervalPace),
      },
      repetition: {
        name: 'REPETITION',
        minPaceSecondsPerKm: Math.round(repetitionPace - 3),
        maxPaceSecondsPerKm: Math.round(repetitionPace + 3),
        targetPaceSecondsPerKm: Math.round(repetitionPace),
        formattedTargetPace: formatPace(repetitionPace),
      },
    },
  };
}

/**
 * Calculates Pace Zones given threshold pace or VDOT.
 */
export function calculatePaceZones(params: { thresholdPaceSecPerKm?: number; vdot?: number }) {
  if (params.vdot) {
    return generateTrainingZones(params.vdot).zones;
  }

  if (params.thresholdPaceSecPerKm) {
    const tPace = params.thresholdPaceSecPerKm;
    return {
      easy: {
        name: 'EASY' as const,
        minPaceSecondsPerKm: Math.round(tPace * 1.15),
        maxPaceSecondsPerKm: Math.round(tPace * 1.30),
        targetPaceSecondsPerKm: Math.round(tPace * 1.22),
        formattedTargetPace: formatPace(tPace * 1.22),
      },
      marathon: {
        name: 'MARATHON' as const,
        minPaceSecondsPerKm: Math.round(tPace * 1.05),
        maxPaceSecondsPerKm: Math.round(tPace * 1.12),
        targetPaceSecondsPerKm: Math.round(tPace * 1.08),
        formattedTargetPace: formatPace(tPace * 1.08),
      },
      threshold: {
        name: 'THRESHOLD' as const,
        minPaceSecondsPerKm: Math.round(tPace - 4),
        maxPaceSecondsPerKm: Math.round(tPace + 4),
        targetPaceSecondsPerKm: Math.round(tPace),
        formattedTargetPace: formatPace(tPace),
      },
      interval: {
        name: 'INTERVAL' as const,
        minPaceSecondsPerKm: Math.round(tPace * 0.90),
        maxPaceSecondsPerKm: Math.round(tPace * 0.95),
        targetPaceSecondsPerKm: Math.round(tPace * 0.92),
        formattedTargetPace: formatPace(tPace * 0.92),
      },
      repetition: {
        name: 'REPETITION' as const,
        minPaceSecondsPerKm: Math.round(tPace * 0.82),
        maxPaceSecondsPerKm: Math.round(tPace * 0.88),
        targetPaceSecondsPerKm: Math.round(tPace * 0.85),
        formattedTargetPace: formatPace(tPace * 0.85),
      },
    };
  }

  throw new Error('Either thresholdPaceSecPerKm or vdot must be provided');
}
