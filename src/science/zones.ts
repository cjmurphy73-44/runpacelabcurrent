// src/science/zones.ts
// Daniels pace zones and Karvonen/%MaxHR heart-rate zones. Pure functions.
//
// Sources:
//  - Daniels, J. 2013. Daniels' Running Formula (2nd ed.). Pace zone %VO2max
//    bands (E/M/T/I/R).
//  - Karvonen, M. 1957. HR-reserve (HRR) zone scaling; percent-of-max fallback
//    when resting HR is unavailable.
//
// Limitations:
//  - Pace zones assume flat terrain; grade adjustment is a separate concern
//    (see grade.ts).
//  - HR zones are population averages; individual lactate threshold should
//    calibrate zone 3 in practice.

export interface PaceZone {
  name: 'EASY' | 'MARATHON' | 'THRESHOLD' | 'INTERVAL' | 'REPETITION';
  minPaceSecondsPerKm: number;
  maxPaceSecondsPerKm: number;
  targetPaceSecondsPerKm: number;
  formattedTargetPace: string;
}

export interface HeartRateZone {
  name: string;
  minBpm: number;
  maxBpm: number;
}

export function formatPace(paceSecondsPerKm: number): string {
  const m = Math.floor(paceSecondsPerKm / 60);
  const s = Math.round(paceSecondsPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s} /km`;
}

// %VO2max anchors for each pace zone (Daniels).
const ZONE_VO2 = {
  easyTarget: 0.52, easyMin: 0.55, easyMax: 0.48,
  marathon: 0.58,
  threshold: 0.637,
  interval: 0.71,
  repetition: 0.77,
};

export function getVelocityFromVO2(vo2: number): number {
  const a = 0.000193;
  const b = 0.2;
  const c = -(vo2 + 29.28);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

export function generateTrainingZones(vdot: number) {
  if (vdot <= 0 || isNaN(vdot)) throw new Error('VDOT must be a positive number');
  const p = (vo2: number) => (1000 / getVelocityFromVO2(vo2)) * 60;

  const easyTarget = p(ZONE_VO2.easyTarget);
  const easyMin = p(ZONE_VO2.easyMin);
  const easyMax = p(ZONE_VO2.easyMax);
  const marathonPace = p(ZONE_VO2.marathon);
  const thresholdPace = p(ZONE_VO2.threshold);
  const intervalPace = p(ZONE_VO2.interval);
  const repetitionPace = p(ZONE_VO2.repetition);

  const wrap = (name: PaceZone['name'], target: number, min: number, max: number): PaceZone => ({
    name, minPaceSecondsPerKm: Math.round(min), maxPaceSecondsPerKm: Math.round(max),
    targetPaceSecondsPerKm: Math.round(target), formattedTargetPace: formatPace(target),
  });

  return {
    vdot,
    zones: {
      easy: wrap('EASY', easyTarget, easyMin, easyMax),
      marathon: { name: 'MARATHON', minPaceSecondsPerKm: Math.round(marathonPace - 4), maxPaceSecondsPerKm: Math.round(marathonPace + 4), targetPaceSecondsPerKm: Math.round(marathonPace), formattedTargetPace: formatPace(marathonPace) },
      threshold: { name: 'THRESHOLD', minPaceSecondsPerKm: Math.round(thresholdPace - 4), maxPaceSecondsPerKm: Math.round(thresholdPace + 4), targetPaceSecondsPerKm: Math.round(thresholdPace), formattedTargetPace: formatPace(thresholdPace) },
      interval: { name: 'INTERVAL', minPaceSecondsPerKm: Math.round(intervalPace - 3), maxPaceSecondsPerKm: Math.round(intervalPace + 3), targetPaceSecondsPerKm: Math.round(intervalPace), formattedTargetPace: formatPace(intervalPace) },
      repetition: { name: 'REPETITION', minPaceSecondsPerKm: Math.round(repetitionPace - 3), maxPaceSecondsPerKm: Math.round(repetitionPace + 3), targetPaceSecondsPerKm: Math.round(repetitionPace), formattedTargetPace: formatPace(repetitionPace) },
    },
  };
}

export function calculateHeartRateZones(maxHr: number, restingHr?: number) {
  if (maxHr <= 0) throw new Error('maxHr must be a positive number');
  const isKarvonen = restingHr !== undefined && restingHr > 0;
  const hrr = isKarvonen ? maxHr - restingHr : maxHr;
  const getBpm = (pct: number) => isKarvonen ? Math.round((restingHr as number) + pct * hrr) : Math.round(pct * maxHr);
  return {
    method: isKarvonen ? 'karvonen' as const : 'percent_max' as const,
    zone1: { name: 'Active Recovery', minBpm: getBpm(0.5), maxBpm: getBpm(0.6) },
    zone2: { name: 'Aerobic / Endurance', minBpm: getBpm(0.6), maxBpm: getBpm(0.7) },
    zone3: { name: 'Tempo / Threshold', minBpm: getBpm(0.7), maxBpm: getBpm(0.8) },
    zone4: { name: 'Anaerobic Capacity', minBpm: getBpm(0.8), maxBpm: getBpm(0.9) },
    zone5: { name: 'Neuromuscular / Speed', minBpm: getBpm(0.9), maxBpm: maxHr },
  };
}

export function calculatePaceZones(params: { thresholdPaceSecPerKm?: number; vdot?: number }) {
  if (params.vdot) return generateTrainingZones(params.vdot).zones;
  if (params.thresholdPaceSecPerKm) {
    const t = params.thresholdPaceSecPerKm;
    const make = (name: PaceZone['name'], min: number, max: number, target: number): PaceZone => ({
      name, minPaceSecondsPerKm: Math.round(min), maxPaceSecondsPerKm: Math.round(max),
      targetPaceSecondsPerKm: Math.round(target), formattedTargetPace: formatPace(target),
    });
    return {
      easy: make('EASY', t * 1.15, t * 1.3, t * 1.22),
      marathon: make('MARATHON', t * 1.05, t * 1.12, t * 1.08),
      threshold: make('THRESHOLD', t - 4, t + 4, t),
      interval: make('INTERVAL', t * 0.9, t * 0.95, t * 0.92),
      repetition: make('REPETITION', t * 0.82, t * 0.88, t * 0.85),
    };
  }
  throw new Error('Either thresholdPaceSecPerKm or vdot must be provided');
}