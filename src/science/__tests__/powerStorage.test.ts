import { parseCsv } from '../../../base44/shared/workoutParsers';
import { describe, expect, it } from 'vitest';
import { inlineWorkoutStream, MAX_STREAM_SAMPLES, storageStream, isUsableTelemetry } from '../../../base44/shared/streamValidity';

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

it('stores the entire recording at the inline limit and leaves longer recordings at their source', () => {
  const samples = Array.from({ length: MAX_STREAM_SAMPLES }, (_, time) => ({ time, power: 150 }));
  expect(inlineWorkoutStream(samples)).toHaveLength(MAX_STREAM_SAMPLES);
  expect(inlineWorkoutStream(samples)?.at(-1)).toMatchObject({ time: MAX_STREAM_SAMPLES - 1, power: 150 });
  expect(inlineWorkoutStream([...samples, { time: MAX_STREAM_SAMPLES, power: 150 }])).toBeUndefined();
  expect(inlineWorkoutStream([])).toBeUndefined();
});

it('uses elapsed CSV seconds without converting numeric samples into calendar dates', () => {
  const parsed = parseCsv('time,power\n0,180\n1,0\n60,185');
  expect(parsed?.stream.map(point => point.time)).toEqual([0, 1, 60]);
  expect(parsed?.summary).toMatchObject({ duration_seconds: 60, derived_date: null });
  const dated = parseCsv('timestamp,power\n2026-11-20T09:00:00Z,180\n2026-11-20T09:01:00Z,185');
  expect(dated?.summary).toMatchObject({ duration_seconds: 60, derived_date: '2026-11-20' });
});
