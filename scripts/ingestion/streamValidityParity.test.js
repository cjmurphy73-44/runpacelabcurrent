import { describe, it, expect } from 'vitest';
import { isUsableTelemetry } from '../../base44/shared/streamValidity.ts';
import { hasVerifiedStreams } from '../../src/lib/streamValidity.js';

const recording = (channel, count = 120) =>
  Array.from({ length: count }, (_, i) => ({ time: i, ...channel(i) }));
const agrees = (stream, duration = 120) => {
  const backend = isUsableTelemetry(stream, duration);
  const frontend = hasVerifiedStreams({ streams: stream, duration_seconds: duration });
  expect(backend).toBe(frontend);
  return backend;
};

describe('verified telemetry gate, synthetic channel coverage', () => {
  it('accepts 30% HR plus 30% power in distinct samples', () =>
    expect(agrees(recording(i => i < 36 ? { heart_rate: 135 } : i < 72 ? { power: 180 } : {}))).toBe(true));
  it('rejects only 40% combined measured samples', () =>
    expect(agrees(recording(i => i < 24 ? { heart_rate: 135 } : i < 48 ? { power: 180 } : {}))).toBe(false));
  it('does not double-count overlapping channels', () =>
    expect(agrees(recording(i => i < 40 ? { heart_rate: 135, power: 180 } : {}))).toBe(false));
  it('accepts HR-only recording', () =>
    expect(agrees(recording(i => ({ heart_rate: i < 60 ? 135 : null })))).toBe(true));
  it('accepts power-only recording', () =>
    expect(agrees(recording(i => ({ power: i < 60 ? 180 : 0 })))).toBe(true));
  it('rejects nonfinite channels', () =>
    expect(agrees(recording(() => ({ heart_rate: NaN, power: NaN })))).toBe(false));
  it('rejects short summary-like series', () =>
    expect(agrees(recording(() => ({ heart_rate: 135 }), 10))).toBe(false));
  it('rejects duration coverage gaps', () =>
    expect(agrees(recording(() => ({ heart_rate: 135 })), 500)).toBe(false));
  it('rejects repeated timestamps', () =>
    expect(agrees(recording(() => ({ heart_rate: 135, time: 0 })))).toBe(false));
});
