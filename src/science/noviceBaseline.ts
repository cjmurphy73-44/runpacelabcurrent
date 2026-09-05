// src/science/noviceBaseline.ts
// Novice calibration fallback: derives a baseline physiological profile when the
// athlete has NO recent race result — from an easy-run pace (distance + time +
// perceived effort) or a weekly-mileage heuristic. Pure, I/O-free, auditable.
//
// Sources:
//  - Daniels, J. 2013. Daniels' Running Formula (2nd ed.). Easy pace ≈ 68% of
//    threshold velocity; threshold ≈ 88% of the Daniels base-velocity curve
//    (baseVel = 29.5 + 0.35·VDOT).
//  - Tanaka et al. 2001 for HRmax; Karvonen-area 88% HRmax for LTHR.
//
// Limitations:
//  - Easy-run back-calculation is a coarse inversion; a conservative effort
//    discount (0.90–0.95) offsets novices who run their "easy" day too fast.
//  - Weekly-mileage mapping is a heuristic band, not a physiological model.

import { calculateHeartRateZones } from "./zones";
import { estimateMaxHr, estimateLthr } from "./daniels";
import type { OnboardingDerivation } from "./daniels";

export interface NoviceInput {
  age?: number;
  sex: "male" | "female" | "other";
  weeklyMileageKm?: number;
  easyRunDistanceKm?: number;
  easyRunMinutes?: number;
  effort?: "easy" | "steady" | "hard";
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function seedLoads(weeklyMileageKm: number) {
  const daily = Math.round((weeklyMileageKm * 6) / 7);
  return { seedCtl: daily, seedAtl: daily, seedTsb: 0 };
}

// VDOT from an easy run: easy pace (sec/km) → easy velocity (m/min) → threshold
// (÷0.68) → base velocity (÷0.88) → VDOT = (baseVel − 29.5) / 0.35.
function vdotFromEasyRun(distanceKm: number, minutes: number, effort: NoviceInput["effort"]): number {
  const easyPaceSecPerKm = (minutes * 60) / distanceKm;
  const easyVelMmin = (1000 / easyPaceSecPerKm) * 60;
  const thresholdVel = easyVelMmin / 0.68;
  const baseVel = thresholdVel / 0.88;
  let v = (baseVel - 29.5) / 0.35;
  if (effort === "steady") v *= 0.95;
  if (effort === "hard") v *= 0.9;
  return Math.max(20, Math.min(85, Math.round(v)));
}

function vdotFromMileage(weeklyMileageKm: number): number {
  const m = weeklyMileageKm;
  if (m >= 80) return 56;
  if (m >= 60) return 50;
  if (m >= 40) return 44;
  if (m >= 25) return 38;
  if (m >= 15) return 34;
  return 30;
}

export function deriveNoviceBaseline(input: NoviceInput): OnboardingDerivation {
  const age = input.age ?? 30;
  const maxHr = estimateMaxHr(age);
  const lactateThresholdHr = estimateLthr(maxHr);

  let vdot: number;
  if (input.easyRunDistanceKm && input.easyRunMinutes && input.easyRunDistanceKm > 0) {
    vdot = vdotFromEasyRun(input.easyRunDistanceKm, input.easyRunMinutes, input.effort);
  } else if (input.weeklyMileageKm) {
    vdot = vdotFromMileage(input.weeklyMileageKm);
  } else {
    vdot = 35;
  }

  const baseVel = 29.5 + vdot * 0.35;
  const thresholdPaceSecPerKm = Math.round(60000 / (baseVel * 0.88));
  const hrZones = calculateHeartRateZones(maxHr) as OnboardingDerivation["hrZones"];
  const seeds = seedLoads(input.weeklyMileageKm ?? 0);

  return {
    vdot,
    thresholdPaceSecPerKm,
    thresholdPaceMs: 1000 / thresholdPaceSecPerKm,
    thresholdPaceFormatted: formatPace(thresholdPaceSecPerKm),
    maxHr,
    lactateThresholdHr,
    hrZones,
    seedCtl: seeds.seedCtl,
    seedAtl: seeds.seedAtl,
    seedTsb: 0,
  };
}