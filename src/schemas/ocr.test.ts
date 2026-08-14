import { describe, expect, it } from 'vitest';
import { OcrExtractionSchema } from './ocr';

describe('OCR Vision Extraction Schema', () => {
  it('validates a complete wearable screenshot extraction payload', () => {
    const payload = {
      confidence: 0.95,
      sportType: 'running',
      distanceMeters: 10000,
      durationSeconds: 2700,
      avgHeartRate: 155,
      maxHeartRate: 172,
      avgPaceSecondsPerKm: 270,
      totalElevationGainMeters: 120,
      avgCadence: 178,
      calories: 680,
      timestamp: '2026-08-14T07:30:00.000Z',
    };

    const parsed = OcrExtractionSchema.parse(payload);
    expect(parsed.distanceMeters).toBe(10000);
    expect(parsed.confidence).toBe(0.95);
    expect(parsed.sportType).toBe('running');
  });

  it('fails validation on negative distance or duration', () => {
    const invalidPayload = {
      confidence: 0.8,
      sportType: 'running',
      distanceMeters: -5000,
      durationSeconds: 1200,
    };

    expect(() => OcrExtractionSchema.parse(invalidPayload)).toThrow(
      'Distance must be a positive number'
    );
  });

  it('defaults sportType to running if missing from payload', () => {
    const minimalPayload = {
      confidence: 0.88,
      distanceMeters: 5000,
      durationSeconds: 1500,
    };

    const parsed = OcrExtractionSchema.parse(minimalPayload);
    expect(parsed.sportType).toBe('running');
  });
});
