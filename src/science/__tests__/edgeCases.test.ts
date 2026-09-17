// src/science/__tests__/edgeCases.test.ts
//
// Edge-case coverage complementing goldenCases.test.ts. Targets the boundary
// conditions the golden suite doesn't pin: zero-data athletes, single-session
// weeks, TRIMP HRR clamping, degenerate HR-reserve, easy-vs-hard rTSS, and
// EWMA decay/robustness. Pure-function assertions only — no I/O, no React.
//
// Note on cross-sport weighting: TRIMP/EWMA are sport-agnostic by design
// (HR-based and TSS-based respectively). Per-sport load weighting is applied
// UPSTREAM in utils/sportMultipliers + lib/crossTrainingEngine, not in these
// science pure functions, so it is intentionally not asserted here.
//
// Run: `npm test`.

import { describe, it, expect } from 'vitest';
import { calculateEWMA, calculaterTSS, calculatehrTSS } from '../load';
import { calcTrimp } from '../trimp';

describe('edge: zero-data athlete', () => {
  it('empty history with no prior load returns all zeros', () => {
    const r = calculateEWMA([]);
    expect(r).toEqual({ ctl: 0, atl: 0, tsb: 0 });
  });

  it('a long all-zero series stays at zero', () => {
    const r = calculateEWMA(Array(30).fill(0));
    expect(r).toEqual({ ctl: 0, atl: 0, tsb: 0 });
  });
});

describe('edge: single-session week', () => {
  it('one 100-TSS day from zero bumps fatigue above fitness (negative form)', () => {
    const r = calculateEWMA([100]);
    expect(r.ctl).toBeCloseTo(2.4, 1);
    expect(r.atl).toBeCloseTo(13.3, 1);
    expect(r.tsb).toBeCloseTo(-10.9, 1);
    expect(r.atl).toBeGreaterThan(r.ctl);
  });

  it('a spike followed by rest days lets fatigue decay back below fitness', () => {
    const r = calculateEWMA([200, 0, 0, 0, 0, 0, 0]);
    // fatigue decays (ATL tau=7d) while fitness barely moves (CTL tau=42d)
    expect(r.atl).toBeLessThan(20);
    expect(r.tsb).toBeGreaterThan(-22);
  });
});

describe('edge: TRIMP HRR clamping', () => {
  it('avg HR below resting HR clamps to zero TRIMP', () => {
    expect(calcTrimp(60, 40, 50, 190, 'male')).toBe(0);
  });

  it('avg HR above max HR clamps to the same value as avg HR at max', () => {
    const above = calcTrimp(60, 200, 50, 190, 'male');
    const atMax = calcTrimp(60, 190, 50, 190, 'male');
    expect(above).toBe(atMax);
    expect(above).toBeGreaterThan(0);
  });
});

describe('edge: degenerate HR reserve', () => {
  it('hrTSS returns zero when max HR <= resting HR (no reserve)', () => {
    const r = calculatehrTSS(3600, 170, 50, 50, 175);
    expect(r.tss).toBe(0);
    expect(r.intensityFactor).toBe(0);
  });
});

describe('edge: rTSS easy vs hard', () => {
  it('easy run has IF<1 and lower TSS; hard run has IF>1 and higher TSS', () => {
    const easy = calculaterTSS(3600, 360, 300); // slower than threshold
    const hard = calculaterTSS(3600, 270, 300); // faster than threshold
    expect(easy.intensityFactor).toBeLessThan(1);
    expect(hard.intensityFactor).toBeGreaterThan(1);
    expect(hard.tss).toBeGreaterThan(easy.tss);
  });
});

describe('edge: EWMA decay & robustness', () => {
  it('a single rest day decays both prior CTL and ATL toward zero', () => {
    const r = calculateEWMA([0], 50, 15);
    expect(r.ctl).toBeLessThan(50);
    expect(r.atl).toBeLessThan(15);
    expect(r.tsb).toBeGreaterThan(0);
  });

  it('a huge single day does not produce NaN/Infinity', () => {
    const r = calculateEWMA([100000]);
    expect(Number.isFinite(r.ctl)).toBe(true);
    expect(Number.isFinite(r.atl)).toBe(true);
    expect(Number.isFinite(r.tsb)).toBe(true);
  });
});