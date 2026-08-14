/**
 * Daniels VDOT Pace & Zone Generator Engine
 * 
 * Translates a given VDOT score into target pace ranges based on Jack Daniels Running Formula:
 * - Easy / Recovery (E): ~52% VDOT VO2 demand
 * - Marathon Pace (M): ~58% VDOT VO2 demand
 * - Threshold Pace (T): ~63.7% VDOT VO2 demand (Lactate Threshold)
 * - Interval Pace (I): ~71% VDOT VO2 demand (VO2max)
 * - Repetition Pace (R): ~77% VDOT VO2 demand (Speed & economy)
 */

export interface PaceZone {
  name: 'EASY' | 'MARATHON' | 'THRESHOLD' | 'INTERVAL' | 'REPETITION';
  minPaceSecondsPerKm: number;
  maxPaceSecondsPerKm: number;
  targetPaceSecondsPerKm: number;
  formattedTargetPace: string; // e.g. "4:03 /km"
}

export interface TrainingZonesResult {
  vdot: number;
  zones: Record<'easy' | 'marathon' | 'threshold' | 'interval' | 'repetition', PaceZone>;
}

/**
 * Formats pace in total seconds per km into "MM:SS /km" format.
 */
export function formatPace(paceSecondsPerKm: number): string {
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.round(paceSecondsPerKm % 60);
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mins}:${paddedSecs} /km`;
}

/**
 * Calculates running velocity (m/min) for a given VO2 cost (mL/kg/min)
 * Inverting Daniels VO2 formula: VO2 = -29.28 + 0.2*v + 0.000193*v^2
 * 0.000193*v^2 + 0.2*v - (VO2 + 29.28) = 0
 */
export function getVelocityFromVO2(vo2: number): number {
  const a = 0.000193;
  const b = 0.2;
  const c = -(vo2 + 29.28);

  return (-b + Math.sqrt(Math.pow(b, 2) - 4 * a * c)) / (2 * a);
}

/**
 * Calculates target training pace zones from a VDOT score.
 */
export function generateTrainingZones(vdot: number): TrainingZonesResult {
  if (vdot <= 0 || isNaN(vdot)) {
    throw new Error('VDOT must be a positive number');
  }

  // Calculate target VO2 demand for each zone relative to VDOT
  const easyVO2 = vdot * 0.52;
  const easyMinVO2 = vdot * 0.55; // Faster Easy
  const easyMaxVO2 = vdot * 0.48; // Slower Recovery Easy

  const marathonVO2 = vdot * 0.58;
  const thresholdVO2 = vdot * 0.637; // Threshold Pace
  const intervalVO2 = vdot * 0.71;   // Interval Pace
  const repetitionVO2 = vdot * 0.77; // Repetition Pace

  // Convert velocities (m/min) -> paces (seconds/km): Pace = (1000 / velocity) * 60
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
