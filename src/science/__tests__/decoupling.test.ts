import { describe, it, expect } from 'vitest';
import {
  computeAerobicDecoupling,
  efficiencyFactor,
  decouplingPercent,
  speedFromPaceSeconds,
  ELEVATED_AEROBIC_DECOUPLING,
} from '../decoupling';

/** Evenly sampled session; HR steps up in the second half to simulate drift. */
function session(minutes: number, speed: number, hrFirst: number, hrSecond: number) {
  const total = minutes * 60;
  const samples = [];
  for (let t = 0; t <= total; t += 30) {
    const second = t > total / 2;
    samples.push({ time: t, value: speed, heartRate: second ? hrSecond : hrFirst });
  }
  return samples;
}

describe('decoupling: efficiency factor convention', () => {
  it('uses speed (not pace) so a higher value is more efficient', () => {
    expect(efficiencyFactor(3, 150)).toBeCloseTo(0.02, 4);
    expect(efficiencyFactor(3.3, 150)!).toBeGreaterThan(efficiencyFactor(3, 150)!);
  });

  it('converts pace to speed before use', () => {
    expect(speedFromPaceSeconds(300)).toBeCloseTo(3.333, 3);
    // Faster pace (lower seconds) yields higher speed and higher EF.
    expect(speedFromPaceSeconds(270)).toBeGreaterThan(speedFromPaceSeconds(300));
  });

  it('returns null without a usable heart rate', () => {
    expect(efficiencyFactor(3, 0)).toBeNull();
  });

  it('computes percentage drift between halves', () => {
    expect(decouplingPercent(0.02, 0.018)).toBeCloseTo(10, 2);
  });
});

describe('decoupling: aerobic splits', () => {
  it('reports no drift for a stable steady-state effort', () => {
    const result = computeAerobicDecoupling(session(60, 3, 150, 150), {
      durationSeconds: 3600,
      sport: 'running',
    });
    expect(result.metric).toBe('Pa:Hr');
    expect(result.evaluated).toBe(true);
    expect(result.decoupling_pct).toBeCloseTo(0, 2);
    expect(result.flag).toBeNull();
  });

  it('flags drift above 5 percent', () => {
    const result = computeAerobicDecoupling(session(60, 3, 150, 160), {
      durationSeconds: 3600,
      sport: 'running',
    });
    // Same speed, HR up 6.67% → EF down 6.25% → elevated
    expect(result.decoupling_pct).toBeGreaterThan(5);
    expect(result.flag).toBe(ELEVATED_AEROBIC_DECOUPLING);
  });

  it('does not flag drift just under the threshold', () => {
    const result = computeAerobicDecoupling(session(60, 3, 150, 157), {
      durationSeconds: 3600,
      sport: 'running',
    });
    expect(result.decoupling_pct).toBeLessThan(5);
    expect(result.flag).toBeNull();
  });

  it('honours an explicit threshold override', () => {
    const result = computeAerobicDecoupling(session(60, 3, 150, 160), {
      durationSeconds: 3600,
      sport: 'running',
      thresholdPct: 10,
    });
    expect(result.decoupling_pct).toBeGreaterThan(5);
    expect(result.flag).toBeNull();
  });

  it('skips the warm-up before splitting halves', () => {
    const samples = [
      { time: 0, value: 6, heartRate: 120 }, // warm-up surge, excluded
      ...session(60, 3, 150, 150),
    ];
    const result = computeAerobicDecoupling(samples, { durationSeconds: 3600, sport: 'running' });
    expect(result.decoupling_pct).toBeCloseTo(0, 2);
  });

  it('does not evaluate sessions shorter than 45 minutes', () => {
    const result = computeAerobicDecoupling(session(30, 3, 150, 150), {
      durationSeconds: 1800,
      sport: 'running',
    });
    expect(result.evaluated).toBe(false);
    expect(result.decoupling_pct).toBeNull();
    expect(result.efficiency_factor).toBeCloseTo(0.02, 4);
  });

  it('uses Pw:Hr for cycling power', () => {
    const cycling = [];
    for (let t = 0; t <= 3600; t += 30) {
      cycling.push({ time: t, value: 250, heartRate: t > 1800 ? 165 : 150 });
    }
    const result = computeAerobicDecoupling(cycling, { durationSeconds: 3600, sport: 'cycling' });
    expect(result.metric).toBe('Pw:Hr');
    expect(result.flag).toBe(ELEVATED_AEROBIC_DECOUPLING);
  });

  it('returns an unevaluated record when no samples carry HR', () => {
    const result = computeAerobicDecoupling([{ time: 0, value: 3, heartRate: null }], {
      durationSeconds: 3600,
      sport: 'running',
    });
    expect(result.evaluated).toBe(false);
    expect(result.efficiency_factor).toBeNull();
  });
});