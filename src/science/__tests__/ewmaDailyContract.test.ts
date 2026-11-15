import { describe, it, expect } from 'vitest';
import { dailyLoadValue, nextDailyEwma } from '../../../base44/shared/ewmaDaily';
import { calculateCTL, calculateATL, calculateEWMA } from '../load';

const zero = { ctl: 0, atl: 0, tsb: 0 };
describe('backend/front-end CTL ATL TSB contract', () => {
  it('first training day uses zero baseline and exponential 42/7 time constants', () => {
    const r = nextDailyEwma(zero, 100);
    expect(r.ctl).toBeCloseTo(calculateCTL(0, 100), 12);
    expect(r.atl).toBeCloseTo(calculateATL(0, 100), 12);
    expect(r.tsb).toBeCloseTo(r.ctl - r.atl, 12);
  });
  it('rest days decay both loads rather than skipping dates', () => {
    let r = nextDailyEwma(zero, 100);
    const day2 = nextDailyEwma(r, 0);
    expect(day2.ctl).toBeLessThan(r.ctl);
    expect(day2.atl).toBeLessThan(r.atl);
    expect(day2.ctl).toBeCloseTo(calculateCTL(r.ctl, 0), 12);
  });
  it('matches the frontend across a multi-day sequence without rounding drift', () => {
    const loads = [50, 0, 100, 0, 0, 75, 20, 0, 0, 0];
    let state = zero;
    for (const load of loads) state = nextDailyEwma(state, load);
    const frontend = calculateEWMA(loads);
    expect(Number(state.ctl.toFixed(1))).toBe(frontend.ctl);
    expect(Number(state.atl.toFixed(1))).toBe(frontend.atl);
    expect(Number((Number(state.ctl.toFixed(1)) - Number(state.atl.toFixed(1))).toFixed(1))).toBe(frontend.tsb);
  });
  it('respects athlete-specific positive time constants', () => {
    const r = nextDailyEwma(zero, 100, 28, 5);
    expect(r.ctl).toBeCloseTo(calculateCTL(0, 100, 28), 12);
    expect(r.atl).toBeCloseTo(calculateATL(0, 100, 5), 12);
  });
  it('keeps explicit zero TRIMP instead of silently selecting TSS', () => {
    expect(dailyLoadValue({ session_trimp: 0, session_tss: 55 })).toBe(0);
  });
  it('uses TSS only when TRIMP is genuinely absent', () => {
    expect(dailyLoadValue({ session_tss: 55 })).toBe(55);
  });
  it('does not turn missing or invalid training load into rest', () => {
    for (const s of [{}, { session_trimp: null }, { session_trimp: -1 }, { session_trimp: NaN }, { session_trimp: Infinity }]) {
      expect(() => dailyLoadValue(s)).toThrow('training_load_missing_or_invalid');
    }
  });
  it('rejects nonfinite load and invalid tau', () => {
    expect(() => nextDailyEwma(zero, NaN)).toThrow();
    expect(() => nextDailyEwma(zero, -1)).toThrow();
    expect(() => nextDailyEwma(zero, 10, 0, 7)).toThrow();
  });
});
