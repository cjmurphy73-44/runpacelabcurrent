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