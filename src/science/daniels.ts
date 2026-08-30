<<<<<<< Updated upstream
// src/science/daniels.ts
// Auto-derivation engine for onboarding: turns a single recent race result +
// basic biometrics into a full baseline physiological profile (VDOT, threshold
// pace, max HR, HR zones, and CTL/ATL/TSB seeds). Pure, I/O-free functions —
// safe to unit-test and audit.
//
// Sources:
//  - Daniels, J. 2013. Daniels' Running Formula (2nd ed.). VDOT, training paces.
//  - Tanaka, H., Monahan, K.D., Seals, D.G. 2001. "Age-predicted maximal heart
//    rate revisited." J. Am. Coll. Cardiol. 38(1):153-156. HRmax = 208 - 0.7*age.
//  - Karvonen-area LTHR convention: lactate threshold ≈ 88% HRmax (Edwards/
//    typical lactate-shift anchor used until a field test calibrates it).

import { calculateVDOT, getTrainingPaces } from './vdot';
import { calculateHeartRateZones, HeartRateZone } from './zones';

export interface OnboardingInput {
  /** Race distance in metres (5000, 10000, 21097.5, 42195). */
  raceDistanceMeters: number;
  /** Finishing time in seconds. */
  raceTimeSeconds: number;
  /** Age in years (takes precedence over dob). */
  age?: number;
  /** Date of birth YYYY-MM-DD (used to derive age when age omitted). */
  dob?: string;
  sex: 'male' | 'female' | 'other';
  /** Estimated average weekly running mileage in km. */
  weeklyMileageKm: number;
}

export interface OnboardingDerivation {
  vdot: number;
  thresholdPaceSecPerKm: number;
  thresholdPaceMs: number;
  thresholdPaceFormatted: string;
  maxHr: number;
  lactateThresholdHr: number;
  hrZones: { method: 'percent_max'; zone1: HeartRateZone; zone2: HeartRateZone; zone3: HeartRateZone; zone4: HeartRateZone; zone5: HeartRateZone };
  seedCtl: number;
  seedAtl: number;
  seedTsb: number;
}

export function estimateMaxHr(age: number): number {
  return Math.round(208 - 0.7 * age); // Tanaka et al. 2001
}

export function estimateLthr(maxHr: number): number {
  return Math.round(maxHr * 0.88); // ~88% HRmax lactate-shift anchor
}

// Coarse TSS seed for a beginner's weekly mileage: ~6 TSS per km of easy
// running, spread across 7 days. CTL and ATL start equal (TSB ≈ 0) until the
// recalc engine recomputes from real sessions.
function seedLoads(weeklyMileageKm: number): { seedCtl: number; seedAtl: number; seedTsb: number } {
  const daily = Math.round((weeklyMileageKm * 6) / 7);
  return { seedCtl: daily, seedAtl: daily, seedTsb: 0 };
}

export function deriveOnboardingProfile(input: OnboardingInput): OnboardingDerivation {
  const age =
    input.age ??
    (input.dob ? new Date().getFullYear() - new Date(input.dob).getFullYear() : 30);

  const vdot = calculateVDOT(input.raceTimeSeconds, input.raceDistanceMeters);
  const paces = getTrainingPaces(vdot);
  const maxHr = estimateMaxHr(age);
  const lactateThresholdHr = estimateLthr(maxHr);
  const hrZones = calculateHeartRateZones(maxHr) as OnboardingDerivation['hrZones'];
  const seeds = seedLoads(input.weeklyMileageKm ?? 0);

  return {
    vdot,
    thresholdPaceSecPerKm: paces.threshold.secPerKm,
    thresholdPaceMs: 1000 / paces.threshold.secPerKm,
    thresholdPaceFormatted: paces.threshold.formatted,
    maxHr,
    lactateThresholdHr,
    hrZones,
    seedCtl: seeds.seedCtl,
    seedAtl: seeds.seedAtl,
    seedTsb: seeds.seedTsb,
  };
}

export const RACE_DISTANCES = [
  { key: '5k', label: '5K', meters: 5000 },
  { key: '10k', label: '10K', meters: 10000 },
  { key: 'half', label: 'Half marathon', meters: 21097.5 },
  { key: 'marathon', label: 'Marathon', meters: 42195 },
] as const;
=======
/**
 * Jack Daniels VDOT & Training Paces Calculation Engine
 * 
 * Implements Jack Daniels' VDOT formula for estimating running aerobic capacity,
 * predicting race finish times across standard distances, and deriving customized
 * training intensity zones (Easy, Marathon, Threshold, Interval, Repetition).
 * 
 * @citation Daniels, J. (2013). Daniels' Running Formula (3rd ed.). Human Kinetics.
 * @citation Daniels, J., & Gilbert, J. (1979). Oxygen requirements for running test. Research Quarterly. American Alliance for Health, Physical Education and Recreation.
 * @assumption Running economy and fractional utilization of VO2max scale predictably with performance time across endurance events.
 * @limitation VDOT estimations from short sprints (<1200m or <3 minutes) or extreme environmental heat/altitude without acclimatization produce distorted results.
 */

import { VdotResult } from './types';

/**
 * Calculates VDOT score from a race or test performance.
 * 
 * @citation Daniels & Gilbert (1979); Daniels (2013)
 * @assumption Energy cost of running is a quadratic function of velocity, and percent max VO2 utilization decays logarithmically with event duration.
 * @limitation Invalid for efforts under 180 seconds or 1200 meters.
 */
export function calculateVDOT(timeSeconds: number, distanceMeters: number): number {
  if (timeSeconds <= 0 || distanceMeters <= 0) {
    throw new Error('Time and distance must be positive numbers');
  }

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

/**
 * Derives personalized training paces and intensity zones from a VDOT score.
 * 
 * @citation Daniels (2013) Training Intensity Zones table
 * @assumption Training zones correspond to fixed percentages of VO2max (Easy 59-74%, Marathon 80-84%, Threshold 88-90%, Interval 95-100%, Repetition 100%+).
 */
export function getVdotPaceZones(vdot: number): VdotResult {
  if (!vdot || vdot <= 0) {
    return {
      vdot: 0,
      easyPaceSecPerKm: 0,
      marathonPaceSecPerKm: 0,
      thresholdPaceSecPerKm: 0,
      intervalPaceSecPerKm: 0,
      repetitionPaceSecPerKm: 0,
    };
  }

  // Inverse VO2 estimation to velocity (approximate mapping for standard VDOT percentages)
  // Using simplified proportional constants calibrated against Daniels tables
  const baseVelocity = 29.5 + vdot * 0.35; // meters per min approximate at threshold
  
  const thresholdVel = baseVelocity * 0.88;
  const easyVel = baseVelocity * 0.68;
  const marathonVel = baseVelocity * 0.81;
  const intervalVel = baseVelocity * 0.97;
  const repetitionVel = baseVelocity * 1.05;

  const toSecPerKm = (vel: number) => Math.round(60000 / Math.max(10, vel));

  return {
    vdot,
    easyPaceSecPerKm: toSecPerKm(easyVel),
    marathonPaceSecPerKm: toSecPerKm(marathonVel),
    thresholdPaceSecPerKm: toSecPerKm(thresholdVel),
    intervalPaceSecPerKm: toSecPerKm(intervalVel),
    repetitionPaceSecPerKm: toSecPerKm(repetitionVel),
  };
}
>>>>>>> Stashed changes
