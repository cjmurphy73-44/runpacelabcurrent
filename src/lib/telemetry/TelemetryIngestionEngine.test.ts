
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
    const result = await engine.processWorkout(workout);
    
    expect(result).toHaveProperty('reconciledStream');
    expect(result).toHaveProperty('dominantSourceFormat');
  });
});
