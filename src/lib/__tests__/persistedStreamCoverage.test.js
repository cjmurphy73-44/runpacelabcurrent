import { describe, expect, it } from 'vitest';
import { classifyPersistedStreamCoverage as classify, canUsePersistedStreamForFullSessionZones as canUse } from '../persistedStreamCoverage.js';

describe('persisted recording coverage guard', () => {
  const stream = (count) => Array.from({ length: count }, (_, time) => ({ time, heart_rate: 130 }));
  it('blocks 3600-sample prefix of an 84-minute ride', () => {
    const coverage = classify({ totalSamples: 5040, storedStream: stream(3600), durationSeconds: 5040 });
    expect(coverage.status).toBe('partial');
    expect(canUse(coverage)).toBe(false);
  });
  it('allows complete dense recording with measured duration', () => {
    const coverage = classify({ totalSamples: 600, storedStream: stream(600), durationSeconds: 600 });
    expect(coverage.status).toBe('complete');
    expect(canUse(coverage)).toBe(true);
  });
  it('does not trust sample-count equality when only a short time window is present', () => {
    const short = stream(600).map(p => ({ ...p, time: p.time / 10 }));
    expect(classify({ totalSamples: 600, storedStream: short, durationSeconds: 600 }).status).toBe('partial');
  });
  it('fails closed on missing or contradictory metadata', () => {
    expect(classify({ totalSamples: 0, storedStream: [], durationSeconds: 10 }).status).toBe('unknown');
    expect(classify({ totalSamples: 600, storedStream: [], durationSeconds: 600 }).status).toBe('missing');
    expect(classify({ totalSamples: 1, storedStream: stream(2), durationSeconds: 2 }).status).toBe('unknown');
  });
  it('rejects a full-count recording containing an unmeasured timestamp gap', () => {
    const points = stream(600);
    for (let i = 300; i < 600; i++) points[i].time += 20;
    const coverage = classify({ totalSamples: 600, storedStream: points, durationSeconds: 620 });
    expect(coverage.status).toBe('partial');
    expect(coverage.reason).toBe('timestamp_gap');
    expect(canUse(coverage)).toBe(false);
  });
  it('rejects coerced timestamp strings and negative recording offsets', () => {
    const strings = stream(600).map(p => ({ ...p, time: String(p.time) }));
    expect(classify({ totalSamples: 600, storedStream: strings, durationSeconds: 600 }).status).toBe('unknown');
    const negative = stream(600).map(p => ({ ...p, time: p.time - 10 }));
    expect(classify({ totalSamples: 600, storedStream: negative, durationSeconds: 600 }).status).toBe('unknown');
  });
  it('rejects out-of-order timestamps', () => {
    expect(classify({ totalSamples: 3, storedStream: [{time:0},{time:2},{time:1}], durationSeconds:3 }).status).toBe('unknown');
  });
});
