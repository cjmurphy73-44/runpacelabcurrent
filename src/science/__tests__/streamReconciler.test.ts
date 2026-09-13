import { describe, it, expect } from 'vitest';
import { sanitizeTelemetryStream, reconcileStreams } from '../../science/streamReconciler';

describe('Telemetry Stream Sanitize & Reconciler', () => {
  it('should filter out duplicate timestamps and clamp anomalies', () => {
    const raw = [
      { timestamp: 100, heartRate: 150, power: 250 },
      { timestamp: 100, heartRate: 180, power: 300 }, // Duplicate
      { timestamp: 101, heartRate: 350, power: 255 }, // HR anomaly (> 250)
      { timestamp: 102, heartRate: 155, power: -50 },  // Power anomaly (< 0)
    ];

    const cleaned = sanitizeTelemetryStream(raw as any);
    expect(cleaned.length).toBe(3);
    expect(cleaned[0].timestamp).toBe(100);
    expect(cleaned[0].heartRate).toBe(150);
    expect(cleaned[1].heartRate).toBe(250); // Clamped from 350
    expect(cleaned[2].power).toBe(0);       // Clamped from -50
  });

  it('should unify multiple sparse streams onto a 1Hz timeline via linear interpolation', () => {
    const hrStream = [
      { timestamp: 0, heartRate: 120 },
      { timestamp: 10, heartRate: 140 },
    ];
    const powerStream = [
      { timestamp: 0, power: 200 },
      { timestamp: 10, power: 220 },
    ];

    const reconciled = reconcileStreams({
      hr: hrStream,
      power: powerStream,
    } as any);

    // Should generate timestamps 0 through 10 (11 points)
    expect(reconciled.length).toBe(11);
    expect(reconciled[0].timestamp).toBe(0);
    expect(reconciled[0].heartRate).toBe(120);
    expect(reconciled[0].power).toBe(200);

    // Midpoint at t = 5
    expect(reconciled[5].timestamp).toBe(5);
    expect(reconciled[5].heartRate).toBe(130); // Interpolated between 120 and 140
    expect(reconciled[5].power).toBe(210);     // Interpolated between 200 and 220

    expect(reconciled[10].timestamp).toBe(10);
    expect(reconciled[10].heartRate).toBe(140);
    expect(reconciled[10].power).toBe(220);
  });

  it('should throw an error on unreasonable duration spans (> 24 hours)', () => {
    const longStream = [
      { timestamp: 0, heartRate: 120 },
      { timestamp: 90000, heartRate: 120 }, // 25 hours
    ];

    expect(() => reconcileStreams({ hr: longStream } as any)).toThrowError(
      /Telemetry stream duration exceeds maximum allowed window/
    );
  });
});
