import { describe, it, expect } from 'vitest';
import { processActivityStreams } from '../telemetryProcessor';

describe('Telemetry Processor Service', () => {
  it('processes stream points and computes max depletion percentage correctly', () => {
    const stream = [
      { timeOffsetSeconds: 0, outputValue: 200 },
      { timeOffsetSeconds: 1, outputValue: 400 }, // Surging above CP (300W)
      { timeOffsetSeconds: 2, outputValue: 400 }, // Further depletion
      { timeOffsetSeconds: 3, outputValue: 150 }, // Recovery
    ];

    const result = processActivityStreams(stream, 300, 20000);

    expect(result.wPrimeAnalysis).toHaveLength(4);
    expect(result.maxDepletionPercent).toBeGreaterThan(0);
    expect(result.maxDepletionPercent).toBeLessThanOrEqual(100);
  });

  it('handles empty streams gracefully', () => {
    const result = processActivityStreams([], 300, 20000);
    expect(result.wPrimeAnalysis).toEqual([]);
    expect(result.maxDepletionPercent).toBe(0);
  });
});
