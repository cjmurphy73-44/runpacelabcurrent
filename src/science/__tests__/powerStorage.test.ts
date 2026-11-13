import { describe, expect, it } from 'vitest';
import { storageStream, isUsableTelemetry } from '../../../base44/shared/streamValidity';

describe('measured cycling power sample retention', () => {
  it('preserves real power and zero-watt coasting without synthesizing missing values', () => {
    const samples = [
      { time: 0, heart_rate: 130, power: 210, speed: 7 },
      { time: 1, heart_rate: 132, power: 0, speed: 7 },
      { time: 2, heart_rate: 133, speed: 7 },
      { time: 3, heart_rate: 134, power: Infinity, speed: 7 },
    ];
    expect(storageStream(samples).map(s => s.power)).toEqual([210, 0, null, null]);
    expect(storageStream(samples).map(s => s.heart_rate)).toEqual([130, 132, 133, 134]);
  });
  it('keeps sparse/invalid power out of stored measurements', () => {
    const samples = [
      { time: 0, power: -5 },
      { time: 1, power: 9000 },
      { time: 2, power: '200' },
    ];
    expect(storageStream(samples).map(s => s.power)).toEqual([null, null, null]);
  });
  it('preserves usable dense power-only recordings as measured telemetry', () => {
    const samples = Array.from({ length: 100 }, (_, time) => ({
      time, power: time % 2 ? 0 : 200,
    }));
    expect(isUsableTelemetry(samples, 100)).toBe(true);
    expect(storageStream(samples).filter(p => p.power === 0)).toHaveLength(50);
  });
});
