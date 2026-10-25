
import { describe, it, expect, vi } from 'vitest';
import { TelemetryIngestionEngine } from './TelemetryIngestionEngine';

describe('TelemetryIngestionEngine', () => {
  it('should process a workout and reconcile streams', async () => {
    const engine = new TelemetryIngestionEngine();
    const workout = {
      sessionId: '1',
      date: '2026-08-30',
      sport: 'running',
      durationMinutes: 60,
      dataStreams: [
        { filename: 'test.fit', type: 'fit' },
        { filename: 'test.tcx', type: 'tcx' }
      ]
    };
    
    // @ts-ignore
    const result = await engine.processWorkout(workout as any);
    
    expect(result).toHaveProperty('reconciledStream');
    expect(result).toHaveProperty('dominantSourceFormat');
  });

  it('should handle workouts with missing or empty dataStreams gracefully', async () => {
    const engine = new TelemetryIngestionEngine();
    
    // Missing dataStreams
    const resultNoStreams = await engine.processWorkout({ sessionId: '2', durationMinutes: 0 });
    expect(resultNoStreams.reconciledStream).toEqual([]);
    expect(resultNoStreams.dominantSourceFormat).toBe('fit');

    // Empty dataStreams
    const resultEmpty = await engine.processWorkout({ dataStreams: [] });
    expect(resultEmpty.reconciledStream).toEqual([]);
    expect(resultEmpty.dominantSourceFormat).toBe('fit');
  });

  it('should handle zero duration and null/missing metrics correctly in static ingestAndReconcile', async () => {
    const files = [
      { filename: 'activity_zeroduration.fit', buffer: '' }
    ];
    const result = await TelemetryIngestionEngine.ingestAndReconcile(files);
    expect(result.dominantSourceFormat).toBe('fit');
    expect(result.reconciledStream).toHaveLength(1);
  });

  it('should handle missing heart rate, missing power, invalid timestamps, and edge cases in parser/reconciliation', async () => {
    const engine = new TelemetryIngestionEngine();
    const workout = {
      sessionId: 'edge-1',
      date: 'invalid-date',
      durationMinutes: null,
      dataStreams: [
        { filename: 'workout_no_hr_power.fit', buffer: { hr: null, power: undefined, timestamp: NaN } },
        { filename: 'workout_bad_ext.unknown', buffer: 'some-data' }
      ]
    };
    const result = await engine.processWorkout(workout as any);
    expect(result.dominantSourceFormat).toBe('fit');
    expect(result.reconciledStream).toHaveLength(2);
  });
});
