import { describe, expect, it } from 'vitest';
import { calculaterTSS, calculatehrTSS, calculateEWMA } from './load';

describe('Training Load & Stress Engine', () => {
  describe('calculaterTSS', () => {
    it('calculates exactly 100 rTSS for a 1-hour run at threshold pace (IF = 1.0)', () => {
      const durationSeconds = 3600; // 1 hr
      const thresholdPace = 240;    // 4:00/km
      const avgPace = 240;          // 4:00/km

      const result = calculaterTSS(durationSeconds, avgPace, thresholdPace);

      expect(result.intensityFactor).toBe(1.0);
      expect(result.tss).toBe(100);
    });

    it('calculates correct rTSS for an easy 45-minute recovery run (IF ~ 0.8)', () => {
      const durationSeconds = 2700; // 45 min
      const thresholdPace = 240;    // 4:00/km
      const avgPace = 300;          // 5:00/km (IF = 240/300 = 0.8)

      const result = calculaterTSS(durationSeconds, avgPace, thresholdPace);

      expect(result.intensityFactor).toBe(0.8);
      // (2700 * 0.8^2 / 3600) * 100 = (2700 * 0.64 / 3600) * 100 = 48
      expect(result.tss).toBe(48);
    });
  });

  describe('calculatehrTSS', () => {
    it('calculates hrTSS based on HR reserve ratios', () => {
      const durationSeconds = 3600;
      const avgHR = 155;
      const restHR = 50;
      const maxHR = 190;
      const thresholdHR = 170;

      const result = calculatehrTSS(durationSeconds, avgHR, restHR, maxHR, thresholdHR);

      expect(result.intensityFactor).toBeGreaterThan(0.8);
      expect(result.tss).toBeGreaterThan(0);
    });
  });


  describe('fail-closed invalid training stress inputs', () => {
    it.each([NaN, Infinity, -Infinity, 0, -10])(
      'rejects invalid duration %s for pace and heart-rate load',
      (duration) => {
        expect(calculaterTSS(duration, 300, 240)).toEqual({ tss: 0, intensityFactor: 0 });
        expect(calculatehrTSS(duration, 155, 50, 190, 170)).toEqual({ tss: 0, intensityFactor: 0 });
      }
    );

    it.each([NaN, Infinity, -Infinity, 0, -5])(
      'rejects invalid pace %s rather than emitting NaN or Infinity',
      (pace) => {
        expect(calculaterTSS(3600, pace, 240)).toEqual({ tss: 0, intensityFactor: 0 });
        expect(calculaterTSS(3600, 300, pace)).toEqual({ tss: 0, intensityFactor: 0 });
      }
    );

    it('rejects nonfinite and physiologically inconsistent HR reserve inputs', () => {
      for (const values of [
        [NaN, 50, 190, 170],
        [155, 50, Infinity, 170],
        [155, 50, 190, 50],
        [155, 190, 190, 190],
        [195, 50, 190, 170],
        [45, 50, 190, 170],
        [155, 50, 190, 200],
      ]) {
        expect(calculatehrTSS(3600, values[0], values[1], values[2], values[3])).toEqual({ tss: 0, intensityFactor: 0 });
      }
    });

    it('retains the known threshold pace and HR reference values', () => {
      expect(calculaterTSS(3600, 240, 240)).toEqual({ tss: 100, intensityFactor: 1 });
      expect(calculatehrTSS(3600, 170, 50, 190, 170)).toEqual({ tss: 100, intensityFactor: 1 });
    });
  });

  describe('calculateEWMA (CTL, ATL, TSB)' () => {
    it('accumulates CTL and ATL correctly over a week of training', () => {
      const dailyTss = [50, 60, 0, 75, 50, 100, 0];
      const { ctl, atl, tsb } = calculateEWMA(dailyTss);

      expect(ctl).toBeGreaterThan(0);
      expect(atl).toBeGreaterThan(ctl); // Fatigue builds faster than fitness initially
      expect(tsb).toBe(Number((ctl - atl).toFixed(1)));
    });
  });
});
