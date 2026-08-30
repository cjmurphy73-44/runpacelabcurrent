// src/science/__tests__/goldenCases.test.ts
// Golden-case regression suite for the science namespace.
//
// Each frozen assertion pins a known-good output. Any code change that shifts a
// golden value must come with a written justification in the commit; CI blocks
// otherwise. Covers: CTL/ATL EWMA stability, rTSS/hrTSS, Banister TRIMP,
// VDOT ↔ equivalent-time round-trip, minetti grade factor, heat/altitude,
// ACWR bands, and race-prediction confidence behavior.
//
// Run: `npm test`.

import { describe, it, expect } from 'vitest';
import {
  calculateCTL, calculateATL, calculateTSB, calculateEWMA, calculaterTSS, calculatehrTSS,
} from '../load';
import { calcTrimp } from '../trimp';
import { calculateVDOT, getEquivalentTimes, getTrainingPaces, solveEquivalentTime } from '../vdot';
import { calculateHeartRateZones, generateTrainingZones } from '../zones';
import { minettiCost, gradeAdjustedPaceFactor, computeDecouplingAndEF, calcRTSS } from '../grade';
import { calculateDewPoint, adjustPaceForEnvironment, heatAdjustmentFactor } from '../environment';
import { calculateACWR } from '../injury';
import { predictRaceTimes } from '../racePrediction';

describe('gold: CTL/ATL EWMA', () => {
  it('zero-history returns previous loads', () => {
    const r = calculateEWMA([], 50, 15);
    expect(r.ctl).toBe(50);
    expect(r.atl).toBe(15);
    expect(r.tsb).toBe(35);
  });

  it('constant-stress equilibrates to that stress', () => {
    // 400 days of identical 100 TSS → CTL (τ=42d) and ATL (τ=7d) both converge to 100.
    const series = Array(400).fill(100);
    const r = calculateEWMA(series);
    expect(r.ctl).toBeCloseTo(100, 0);
    expect(r.atl).toBeCloseTo(100, 0);
    expect(r.tsb).toBeCloseTo(0, 0);
  });

  it('one-day single-step CTL matches iterative form', () => {
    const one = calculateCTL(50, 100, 42);
    const iter = calculateEWMA([100], 50, 0, 42, 7);
    expect(one).toBeCloseTo(iter.ctl, 1);
  });

  it('stability: a spike in fatigue decays over ATL (7d) faster than CTL (42d)', () => {
    const series = [0, 0, 0, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const r = calculateEWMA(series, 50, 10);
    // After 14 days the acute spike has decayed; fatigue back near pre-spike.
    expect(r.atl).toBeLessThan(r.ctl); // fitness still above fatigue
  });
});

describe('gold: rTSS / hrTSS', () => {
  it('rTSS for a 60-min run at threshold pace = 100', () => {
    const { tss, intensityFactor } = calculaterTSS(3600, 300, 300);
    expect(intensityFactor).toBe(1);
    expect(tss).toBe(100);
  });

  it('rTSS returns 0 for invalid paces', () => {
    expect(calculaterTSS(3600, 0, 300).tss).toBe(0);
    expect(calculaterTSS(3600, 300, 0).tss).toBe(0);
  });

  it('hrTSS intensityFactor = avgHRR / thresholdHRR', () => {
    const { intensityFactor } = calculatehrTSS(3600, 170, 50, 200, 175);
    // avgHRR = (170-50)/150 = 0.8; thrHRR = (175-50)/150 = 0.8333
    expect(intensityFactor).toBeCloseTo(0.96, 1);
  });
});

describe('gold: Banister TRIMP', () => {
  it('male 60min @ 160bpm (rest 50, max 190) is ~116', () => {
    const t = calcTrimp(60, 160, 50, 190, 'male');
    expect(t).toBeGreaterThan(80);
    expect(t).toBeLessThan(140);
  });
  it('female exponent inflates high-HRR effort vs male', () => {
    const m = calcTrimp(60, 180, 50, 190, 'male');
    const f = calcTrimp(60, 180, 50, 190, 'female');
    expect(f).toBeGreaterThan(m); // female b=1.67 dominates at high HRR
  });
  it('returns 0 when maxHr <= restHr', () => {
    expect(calcTrimp(60, 150, 190, 50, 'male')).toBe(0);
  });
});

describe('gold: VDOT ↔ race times', () => {
  it('a 20:00 5K (~VDOT 50) predicts reasonable equivalents', () => {
    const v = calculateVDOT(1200, 5000);
    expect(v).toBeGreaterThan(45);
    expect(v).toBeLessThan(60);
    const eq = getEquivalentTimes(v);
    expect(eq.tenKm.seconds).toBeGreaterThan(1200 * 2);
    expect(eq.marathon.seconds).toBeLessThan(4 * 3600);
  });

  it('rejects short sprints', () => {
    expect(() => calculateVDOT(60, 400)).toThrow();
  });

  it('round-trip: equivalent time for the input distance reproduces the input time', () => {
    const v = calculateVDOT(1200, 5000);
    const t = solveEquivalentTime(v, 5000);
    expect(Math.abs(t - 1200)).toBeLessThan(20); // within 20 s
  });

  it('Daniels T-pace < M-pace < E-pace for VDOT 50', () => {
    const p = getTrainingPaces(50);
    expect(p.threshold.secPerKm).toBeLessThan(p.marathon.secPerKm);
    expect(p.marathon.secPerKm).toBeLessThan(p.easy.secPerKm);
  });
});

describe('gold: HR zones', () => {
  it('Karvonen zone 3 lower bound uses HRR', () => {
    const z = calculateHeartRateZones(200, 50);
    // zone3 min = 50 + 0.7 * (200-50) = 155
    expect(z.zone3.minBpm).toBe(155);
    expect(z.method).toBe('karvonen');
  });
  it('falls back to percent_max when no resting HR', () => {
    const z = calculateHeartRateZones(200);
    expect(z.method).toBe('percent_max');
    expect(z.zone2.maxBpm).toBe(140); // 0.7 * 200
  });
});

describe('gold: Minetti grade', () => {
  it('flat cost is 3.6 J/kg/m', () => {
    expect(minettiCost(0)).toBeCloseTo(3.6, 5);
  });
  it('uphill slows (>1), mild downhill speeds (<1)', () => {
    expect(gradeAdjustedPaceFactor(0.05)).toBeGreaterThan(1);
    expect(gradeAdjustedPaceFactor(-0.05)).toBeLessThan(1);
  });
  it('downhill clamps at -12%', () => {
    expect(gradeAdjustedPaceFactor(-0.5)).toBeCloseTo(gradeAdjustedPaceFactor(-0.12), 5);
  });
  it('EF + decoupling null for short run', () => {
    const r = computeDecouplingAndEF(
      [{ time: 0, ngp: 3, hr: 150 }, { time: 600, ngp: 3, hr: 150 }],
      10,
    );
    expect(r.aerobic_decoupling).toBeNull();
  });
});

describe('gold: environment / heat', () => {
  it('dew point at 100% RH equals temperature', () => {
    expect(calculateDewPoint(20, 100)).toBeCloseTo(20, 0);
  });
  it('altitude > 1000m applies penalty', () => {
    const low = adjustPaceForEnvironment(360, { temperatureC: 10, relativeHumidity: 50, altitudeMeters: 0 });
    const high = adjustPaceForEnvironment(360, { temperatureC: 10, relativeHumidity: 50, altitudeMeters: 2000 });
    expect(high.totalPaceMultiplier).toBeGreaterThan(low.totalPaceMultiplier);
  });
  it('heat adjustment 1.0 below score 110', () => {
    expect(heatAdjustmentFactor(50, 50)).toBe(1.0); // score 100
  });
  it('heat adjustment > 1 above score 110', () => {
    expect(heatAdjustmentFactor(70, 50)).toBeGreaterThan(1.0); // score 120
  });
});

describe('gold: ACWR', () => {
  it('Green below 1.2', () => {
    const hist = Array(28).fill(100);
    const r = calculateACWR(hist);
    expect(r.acwr).toBeCloseTo(1, 1);
    expect(r.zone).toBe('Green');
  });
  it('Red above 1.5', () => {
    const hist = Array(21).fill(100).concat(Array(7).fill(200));
    const r = calculateACWR(hist);
    expect(r.zone).toBe('Red');
  });
  it('returns Green with < 14 days', () => {
    expect(calculateACWR(Array(7).fill(100)).zone).toBe('Green');
  });
});

describe('gold: race prediction confidence', () => {
  it('produces wider band with fewer qualifying runs', () => {
    const low = predictRaceTimes({ vdot: 50, tsb: 10, qualifyingRunCount: 6 })
      .predictions[2]; // half marathon
    const high = predictRaceTimes({ vdot: 50, tsb: 10, qualifyingRunCount: 0 })
      .predictions[2];
    const lowSpread = low.bandSeconds.high - low.bandSeconds.low;
    const highSpread = high.bandSeconds.high - high.bandSeconds.low;
    expect(highSpread).toBeGreaterThan(lowSpread);
  });
  it('widen band when TSB far outside peak zone', () => {
    const peak = predictRaceTimes({ vdot: 50, tsb: 10, qualifyingRunCount: 3 }).predictions[3];
    const over = predictRaceTimes({ vdot: 50, tsb: -30, qualifyingRunCount: 3 }).predictions[3];
    expect(over.bandSeconds.high - over.bandSeconds.low).toBeGreaterThan(
      peak.bandSeconds.high - peak.bandSeconds.low,
    );
  });
  it('returns no predictions without a VDOT/result', () => {
    const r = predictRaceTimes({});
    expect(r.predictions.length).toBe(0);
    expect(r.confidence).toBe(0);
  });
  it('derives VDOT from a race result', () => {
    const r = predictRaceTimes({ raceTimeSeconds: 1200, raceDistanceMeters: 5000, tsb: 10 });
    expect(r.vdot).not.toBeNull();
    expect(r.predictions.length).toBeGreaterThan(0);
  });
});