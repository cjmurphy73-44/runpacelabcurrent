import { describe, expect, it } from 'vitest';
import { generateTrainingZones, formatPace } from './zones';

describe('Daniels VDOT Pace Zone Generator Engine', () => {
  it('formats pace seconds correctly into MM:SS string', () => {
    expect(formatPace(240)).toBe('4:00 /km');
    expect(formatPace(275)).toBe('4:35 /km');
    expect(formatPace(305)).toBe('5:05 /km');
  });

  it('generates logically ordered pace zones for VDOT 50 runner', () => {
    const vdot50 = generateTrainingZones(50);

    expect(vdot50.vdot).toBe(50);
    const { easy, marathon, threshold, interval, repetition } = vdot50.zones;

    // Repetition should be faster than Interval, Interval faster than Threshold, etc.
    expect(repetition.targetPaceSecondsPerKm).toBeLessThan(interval.targetPaceSecondsPerKm);
    expect(interval.targetPaceSecondsPerKm).toBeLessThan(threshold.targetPaceSecondsPerKm);
    expect(threshold.targetPaceSecondsPerKm).toBeLessThan(marathon.targetPaceSecondsPerKm);
    expect(marathon.targetPaceSecondsPerKm).toBeLessThan(easy.targetPaceSecondsPerKm);
  });

  it('produces expected threshold pace for VDOT 50 (~4:00 - 4:10 /km range)', () => {
    const { zones } = generateTrainingZones(50);

    // VDOT 50 Threshold pace is approx 4:00 - 4:08 /km
    expect(zones.threshold.targetPaceSecondsPerKm).toBeGreaterThanOrEqual(235);
    expect(zones.threshold.targetPaceSecondsPerKm).toBeLessThanOrEqual(255);
  });

  it('throws error for invalid VDOT scores', () => {
    expect(() => generateTrainingZones(0)).toThrow('VDOT must be a positive number');
    expect(() => generateTrainingZones(-10)).toThrow('VDOT must be a positive number');
  });
});
