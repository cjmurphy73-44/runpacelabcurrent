import { getTrainingPaces } from './vdot';

export type IntervalFormat = '10x1000' | '5x2000' | '4x3000';

export interface NorwegianPrescription {
  format: IntervalFormat;
  vdot: number;
  recommendedPaceSecPerKm: number;
  formattedPace: string;
  targetLactateMin: number;
  targetLactateMax: number;
  targetRpe: number;
  recoverySeconds: number;
  repeatCount: number;
  repeatDistanceMeters: number;
  totalWorkMeters: number;
}

export interface DecouplingResult {
  decouplingPct: number;
  isExceeded: boolean;
  status: string;
}

export interface TelemetryInputs {
  firstHalfAvgSpeed: number;
  firstHalfAvgHr: number;
  secondHalfAvgSpeed: number;
  secondHalfAvgHr: number;
}

export function calculateNorwegianPrescription(vdot: number, format: IntervalFormat): NorwegianPrescription {
  const paces = getTrainingPaces(vdot);
  const targetSecPerKm = Math.round(paces.threshold.secPerKm + 3);

  const mins = Math.floor(targetSecPerKm / 60);
  const secs = targetSecPerKm % 60;
  const formattedPace = `${mins}:${secs < 10 ? '0' : ''}${secs}/km`;

  let repeatCount = 10;
  let repeatDistanceMeters = 1000;
  let recoverySeconds = 45;

  if (format === '5x2000') {
    repeatCount = 5;
    repeatDistanceMeters = 2000;
    recoverySeconds = 90;
  } else if (format === '4x3000') {
    repeatCount = 4;
    repeatDistanceMeters = 3000;
    recoverySeconds = 120;
  }

  const totalWorkMeters = repeatCount * repeatDistanceMeters;

  return {
    format,
    vdot,
    recommendedPaceSecPerKm: targetSecPerKm,
    formattedPace,
    targetLactateMin: 2.0,
    targetLactateMax: 3.5,
    targetRpe: 6.5,
    recoverySeconds,
    repeatCount,
    repeatDistanceMeters,
    totalWorkMeters,
  };
}

export function calculateDecoupling(inputs: TelemetryInputs): DecouplingResult {
  const ef1 = inputs.firstHalfAvgHr > 0 ? inputs.firstHalfAvgSpeed / inputs.firstHalfAvgHr : 0;
  const ef2 = inputs.secondHalfAvgHr > 0 ? inputs.secondHalfAvgSpeed / inputs.secondHalfAvgHr : 0;

  let decouplingPct = 0;
  if (ef1 > 0 && ef2 > 0) {
    decouplingPct = Number((((ef1 - ef2) / ef1) * 100).toFixed(1));
  }

  const absDecoupling = Math.abs(decouplingPct);
  const isExceeded = absDecoupling > 5.0;
  const status = isExceeded
    ? `Aerobic decoupling is ${absDecoupling}%, exceeding the 5.0% threshold. Cardiac drift indicates accumulated fatigue or excessive initial intensity.`
    : `Aerobic decoupling is ${absDecoupling}%, well within the target < 5.0% band. Excellent aerobic stability and pacing control.`;

  return {
    decouplingPct: absDecoupling,
    isExceeded,
    status,
  };
}
