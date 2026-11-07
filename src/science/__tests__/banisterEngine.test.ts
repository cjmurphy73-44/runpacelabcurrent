import { describe, it, expect } from 'vitest';
import { calculateNextBanisterState, simulateBanisterSeries, BanisterState } from '../banisterEngine';

describe('banisterEngine', () => {
  it('should initialize correctly with zero load', () => {
    const state: BanisterState = { ctl: 0, atl: 0, tsb: 0 };
    const next = calculateNextBanisterState(state, 0);
    expect(next).toEqual({ ctl: 0, atl: 0, tsb: 0 });
  });

  it('should simulate steady load (40-50km/week roughly 50 TSS/day)', () => {
    const tssSeries = new Array(60).fill(50);
    const results = simulateBanisterSeries(tssSeries);
    const final = results[results.length - 1];

    // CTL should approach 50 asymptotically
    expect(final.ctl).toBeGreaterThan(45);
    expect(final.ctl).toBeLessThan(51);
    // Fatigue (ATL) should also approach 50 but faster
    expect(final.atl).toBeGreaterThan(49);
    expect(final.atl).toBeLessThan(51);
  });

  it('should handle a high-intensity spike (ATL reacts faster than CTL)', () => {
    const tssSeries = [100, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const results = simulateBanisterSeries(tssSeries);

    // Day 0: 100 TSS
    // Day 1: Decay (100 -> ~86 for CTL, ~25 for ATL)
    expect(results[1].atl).toBeLessThan(results[1].ctl);
  });

  it('should verify 14-day taper window (positive TSB recovery)', () => {
    // Build some initial fitness/fatigue
    const initialTss = new Array(30).fill(60);
    const initialState = simulateBanisterSeries(initialTss).pop()!;

    // Taper: 0 TSS for 14 days
    const taperSeries = new Array(14).fill(0);
    const results = simulateBanisterSeries(taperSeries, initialState);

    // TSB should increase (get less negative/more positive)
    expect(results[results.length - 1].tsb).toBeGreaterThan(initialState.tsb);
  });
});
