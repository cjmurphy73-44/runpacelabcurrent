import { describe, it, expect } from 'vitest';
import {
  computeNormalizedPower,
  normalizedPowerFromStream,
  computeCyclingNormalization,
  computeRunningNormalization,
  computeCriticalSwimSpeed,
  computeSwimNormalization,
  normalizeSession,
  calcEdwardsTrimp,
  resampleToSeconds,
  speedFromPace,
} from '../normalization';

// Builds a stream with a cumulative distance channel so grade is computable.
const stream = (samples: Array<[number, number, number?]>) => {
  let distance = 0;
  return samples.map(([time, speed, altitude], i) => {
    if (i > 0) distance += speed * (time - samples[i - 1][0]);
    return { time, speed, altitude: altitude ?? 0, distance };
  });
};

describe('normalization: Coggan Normalized Power', () => {
  it('returns mean power for a perfectly steady effort', () => {
    const steady = new Array(120).fill(200);
    expect(computeNormalizedPower(steady)).toBe(200);
  });

  it('weights surges above arithmetic mean', () => {
    // 30 s at 300 W then 30 s at 100 W: mean 200 W, NP must be higher.
    const alternating = [...new Array(30).fill(300), ...new Array(30).fill(100)];
    const np = computeNormalizedPower(alternating);
    const mean = alternating.reduce((s, v) => s + v, 0) / alternating.length;
    expect(mean).toBe(200);
    expect(np).toBeGreaterThan(mean);
  });

  it('uses the 30 s rolling window, not the raw series', () => {
    const singleSpike = new Array(240).fill(200);
    singleSpike[120] = 1200;
    const np = computeNormalizedPower(singleSpike);
    // A one-second spike cannot lift NP much once averaged over 30 s.
    expect(np).toBeGreaterThan(200);
    expect(np).toBeLessThan(230);
  });

  it('collapses to the arithmetic mean when there are fewer than 30 samples', () => {
    expect(computeNormalizedPower([250, 150, 200])).toBe(200);
  });

  it('resamples an irregular power stream onto a 1 s grid', () => {
    const grid = resampleToSeconds([
      { time: 0, value: 200 },
      { time: 300, value: 200 },
    ]);
    expect(grid.length).toBe(301);
    expect(normalizedPowerFromStream([
      { time: 0, power: 200 },
      { time: 600, power: 200 },
    ])).toBe(200);
  });

  it('computes TSS = 100 for one hour at FTP', () => {
    const power = new Array(600).fill(250);
    const bike = computeCyclingNormalization(
      power.map((p, i) => ({ time: i, power: p })),
      250,
      3600,
    );
    expect(bike).not.toBeNull();
    expect(bike!.normalized_power_watts).toBe(250);
    expect(bike!.intensity_factor).toBe(1);
    expect(bike!.tss).toBeCloseTo(100, 2);
  });

  it('refuses to compute cycling load without FTP or usable power', () => {
    expect(computeCyclingNormalization([], 250, 3600)).toBeNull();
    expect(
      computeCyclingNormalization(
        new Array(600).fill(0).map((_, i) => ({ time: i, power: 200 })),
        null,
        3600,
      ),
    ).toBeNull();
  });
});

describe('normalization: Grade-Adjusted Pace and rTSS', () => {
  it('raises normalized speed above raw speed on a climb', () => {
    const uphill = stream([
      [0, 3, 0],
      [60, 3, 6],
      [120, 3, 12],
      [180, 3, 18],
      [240, 3, 24],
      [300, 3, 30],
      [360, 3, 36],
      [420, 3, 42],
      [480, 3, 48],
      [540, 3, 54],
      [600, 3, 60],
    ]);
    const flat = upstreamFlat();
    const climb = computeRunningNormalization({
      stream: uphill,
      durationSeconds: 600,
      thresholdPaceSecPerKm: 300,
    });
    const level = computeRunningNormalization({
      stream: flat,
      durationSeconds: 600,
      thresholdPaceSecPerKm: 300,
    });
    expect(climb!.normalized_speed_mps).toBeGreaterThan(3);
    expect(climb!.normalized_speed_mps).toBeGreaterThan(level!.normalized_speed_mps);
    expect(climb!.source).toBe('stream');
  });

  it('computes rTSS ≈ 100 for one hour at threshold pace', () => {
    const run = computeRunningNormalization({
      durationSeconds: 3600,
      distanceKm: 12.5, // 3.472 m/s equals a 288 s/km threshold
      thresholdPaceSecPerKm: 288,
    });
    expect(run).not.toBeNull();
    expect(run!.intensity_factor).toBeCloseTo(1, 2);
    expect(run!.rtss).toBeCloseTo(100, 0);
    expect(run!.source).toBe('session');
  });

  it('falls back to laps when no stream exists', () => {
    const run = computeRunningNormalization({
      laps: [
        { distance_km: 1, duration_s: 300 },
        { distance_km: 1, duration_s: 300 },
      ],
      durationSeconds: 600,
      thresholdPaceSecPerKm: 300,
    });
    expect(run!.source).toBe('laps');
    expect(run!.rtss).toBeCloseTo(16.67, 1); // 10 min at IF 1 → (600/3600)*100
  });

  it('returns null without a threshold pace anchor', () => {
    expect(
      computeRunningNormalization({ durationSeconds: 1800, distanceKm: 5, thresholdPaceSecPerKm: null }),
    ).toBeNull();
  });
});

describe('normalization: critical swim speed and sTSS', () => {
  it('derives CSS from 200 m / 400 m benchmarks', () => {
    const css = computeCriticalSwimSpeed(160, 350);
    expect(css).not.toBeNull();
    expect(css!.css_mps).toBeCloseTo(200 / 190, 4);
    expect(css!.css_sec_per_100m).toBeCloseTo(100 / (200 / 190), 1);
  });

  it('rejects an inverted or equal benchmark pair', () => {
    expect(computeCriticalSwimSpeed(350, 300)).toBeNull();
    expect(computeCriticalSwimSpeed(300, 300)).toBeNull();
  });

  it('returns sTSS ≈ 50 for 30 min at CSS', () => {
    const css = computeCriticalSwimSpeed(160, 350)!;
    const swim = computeSwimNormalization({
      durationSeconds: 1800,
      distanceKm: (css.css_mps * 1800) / 1000,
      cssMps: css.css_mps,
    });
    expect(swim).not.toBeNull();
    expect(swim!.intensity_factor).toBeCloseTo(1, 2);
    expect(swim!.stss).toBeCloseTo(50, 0);
  });

  it('normalizes a swim stream with the 4th-power weighting', () => {
    const css = 1.0;
    const points = new Array(600).fill(0).map((_, i) => ({
      time: i,
      speed: i < 300 ? 1.2 : 0.8,
    }));
    const swim = computeSwimNormalization({ stream: points, durationSeconds: 600, cssMps: css });
    expect(swim!.source).toBe('stream');
    expect(swim!.intensity_factor).toBeGreaterThan(1);
  });
});

describe('normalization: cross-training fallback', () => {
  it('weights Edwards zone TRIMP by zone', () => {
    // 10 min in Z1, 10 in Z2, 10 in Z5 → 10 + 20 + 50
    expect(calcEdwardsTrimp([600, 600, 0, 0, 600])).toBe(80);
  });

  it('uses Banister TRIMP when HR is the only signal', () => {
    const result = normalizeSession({
      sport: 'strength',
      durationSeconds: 3600,
      avgHr: 150,
      restHr: 50,
      maxHr: 190,
      sex: 'male',
    });
    expect(result.method).toBe('banister_trimp');
    expect(result.load).toBeGreaterThan(0);
  });

  it('uses Edwards TRIMP when only a zone distribution exists', () => {
    const result = normalizeSession({
      sport: 'other',
      durationSeconds: 3600,
      zoneSeconds: [600, 600, 600, 600, 600],
    });
    expect(result.method).toBe('edwards_trimp');
    expect(result.load).toBe(45);
  });

  it('falls back for cycling without power data', () => {
    const result = normalizeSession({
      sport: 'cycling',
      durationSeconds: 3600,
      avgHr: 140,
      restHr: 50,
      maxHr: 190,
      ftpWatts: 250,
    });
    expect(result.method).toBe('banister_trimp');
  });

  it('falls back for swimming without a CSS benchmark', () => {
    const result = normalizeSession({
      sport: 'swimming',
      durationSeconds: 1800,
      distanceKm: 1.5,
      avgHr: 140,
      restHr: 50,
      maxHr: 190,
    });
    expect(result.method).toBe('banister_trimp');
  });

  it('routes running to rTSS when a threshold pace is present', () => {
    const result = normalizeSession({
      sport: 'running',
      durationSeconds: 3600,
      distanceKm: 12.5,
      thresholdPaceSecPerKm: 288,
      avgHr: 160,
      restHr: 50,
      maxHr: 190,
    });
    expect(result.method).toBe('gap_rtss');
    expect(speedFromPace(288)).toBeCloseTo(3.472, 3);
  });

  it('returns a zero-load record instead of throwing on empty input', () => {
    const result = normalizeSession({ sport: 'other', durationSeconds: 0 });
    expect(result.load).toBe(0);
  });
});

function upstreamFlat() {
  return stream(new Array(11).fill(0).map((_, i) => [i * 60, 3, 0] as [number, number, number]));
}