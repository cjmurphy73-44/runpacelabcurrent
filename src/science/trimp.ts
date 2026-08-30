// src/science/trimp.ts
// Banister's TRIMP (Training Impulse) — heart-rate-reserve weighted, sex-banded.
// Pure function.
//
// Source: Banister, E.W. 1991. "Modeling elite athletic performance." In:
// MacDougall, Wenger & Green (eds), Physiological Testing of the High-
// Performance Athlete (2nd ed.). The exponential form weights higher HR-reserve
// fractions more heavily to reflect the nonlinear cost of intense effort.
//
// Coefficients (a, b) by sex:
//  Male:   a = 0.64, b = 1.92
//   Female: a = 0.86, b = 1.67
//
// Limitations:
//  - Assumes a linear HR-rest-to-max scaling; over-counts intervals (a sustained
//    threshold interval scores the same as a steady run at the same avg HR).
//  - Requires a valid max/rest HR pair; if maxHR <= restHR the function returns 0.

export type Sex = 'male' | 'female' | 'other';

/** Banister TRIMP for a single session. durationMinutes, avgHr, restHr, maxHr. */
export function calcTrimp(
  durationMin: number,
  avgHr: number,
  restHr: number,
  maxHr: number,
  sex: Sex,
): number {
  if (!durationMin || !avgHr || !maxHr || maxHr <= restHr) return 0;
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const isFemale = sex === 'female';
  const a = isFemale ? 0.86 : 0.64;
  const b = isFemale ? 1.67 : 1.92;
  return Math.round(durationMin * hrr * a * Math.exp(b * hrr) * 100) / 100;
}