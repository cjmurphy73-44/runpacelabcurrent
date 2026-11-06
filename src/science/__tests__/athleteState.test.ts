import { describe, it, expect } from 'vitest';
import {
  buildAthleteStateSummary,
  zoneDistribution,
  toStoredCaloriesSource,
  caloriesProvenance,
  PROVENANCE,
  buildWorkloadSamples,
} from '../athleteState';

const loadHistory = new Array(30).fill(0).map((_, i) => ({
  date: `2026-01-${String(i + 1).padStart(2, '0')}`,
  load: 50,
}));

const powerStream = new Array(600).fill(0).map((_, i) => ({
  time: i,
  power: 250,
  heart_rate: 150,
}));

describe('athleteState: summary shape', () => {
  it('routes a cycling session with power to power_tss', () => {
    const summary = buildAthleteStateSummary({
      athleteId: 'athlete_1',
      date: '2026-01-30',
      sport: 'cycling',
      durationSeconds: 3600,
      stream: powerStream,
      ftpWatts: 250,
      avgHr: 150,
      loadHistory,
    });
    expect(summary.normalized.method).toBe('power_tss');
    expect(summary.normalized.normalized_power_watts).toBe(250);
    expect(summary.normalized.load).toBeCloseTo(100, 1);
    expect(summary.session.duration_minutes).toBe(60);
  });

  it('keeps every block the LLM receives populated', () => {
    const summary = buildAthleteStateSummary({
      athleteId: 'athlete_1',
      date: '2026-01-30',
      sport: 'running',
      durationSeconds: 3600,
      distanceKm: 12.5,
      avgHr: 160,
      zoneSeconds: [300, 1200, 1200, 600, 300],
      zoneMethod: 'stream',
      thresholdPaceSecPerKm: 288,
      calories: 780,
      caloriesSource: 'device',
      loadHistory,
    });
    expect(summary.schema_version).toBe(1);
    expect(summary.session.avg_pace_sec_per_km).toBe(288);
    expect(summary.normalized.method).toBe('gap_rtss');
    expect(summary.zones.distribution_pct).toHaveLength(5);
    expect(summary.load_state.acwr).not.toBeNull();
    expect(Array.isArray(summary.adaptation_flags)).toBe(true);
  });

  it('is deterministic for identical input', () => {
    const input = {
      athleteId: 'athlete_1',
      date: '2026-01-30',
      sport: 'cycling',
      durationSeconds: 3600,
      stream: powerStream,
      ftpWatts: 250,
      loadHistory,
    };
    expect(JSON.stringify(buildAthleteStateSummary(input))).toBe(
      JSON.stringify(buildAthleteStateSummary(input)),
    );
  });
});

describe('athleteState: provenance', () => {
  it('marks device-reported calories as measured_device', () => {
    const summary = buildAthleteStateSummary({
      athleteId: 'a',
      date: '2026-01-30',
      sport: 'cycling',
      durationSeconds: 3600,
      calories: 900,
      caloriesSource: 'device',
    });
    expect(summary.provenance.calories).toBe(PROVENANCE.MEASURED_DEVICE);
  });

  it('marks an estimated calorie value as calculated_estimate', () => {
    const summary = buildAthleteStateSummary({
      athleteId: 'a',
      date: '2026-01-30',
      sport: 'cycling',
      durationSeconds: 3600,
      calories: 900,
      caloriesSource: 'estimated',
    });
    expect(summary.provenance.calories).toBe(PROVENANCE.CALCULATED_ESTIMATE);
  });

  it('marks stream zones and streams as measured_device', () => {
    const summary = buildAthleteStateSummary({
      athleteId: 'a',
      date: '2026-01-30',
      sport: 'cycling',
      durationSeconds: 3600,
      stream: powerStream,
      zoneSeconds: [60, 60, 60, 60, 60],
      zoneMethod: 'stream',
      ftpWatts: 250,
    });
    expect(summary.provenance.zones).toBe(PROVENANCE.MEASURED_DEVICE);
    expect(summary.provenance.streams).toBe(PROVENANCE.MEASURED_DEVICE);
  });

  it('marks an average-HR zone estimate as calculated_estimate', () => {
    const summary = buildAthleteStateSummary({
      athleteId: 'a',
      date: '2026-01-30',
      sport: 'running',
      durationSeconds: 3600,
      zoneSeconds: [0, 0, 3600, 0, 0],
      zoneMethod: 'average',
    });
    expect(summary.provenance.zones).toBe(PROVENANCE.CALCULATED_ESTIMATE);
  });

  it('never claims measured provenance for the load equation itself', () => {
    const summary = buildAthleteStateSummary({
      athleteId: 'a',
      date: '2026-01-30',
      sport: 'cycling',
      durationSeconds: 3600,
      stream: powerStream,
      ftpWatts: 250,
    });
    expect(summary.provenance.session_load).toBe(PROVENANCE.CALCULATED_ESTIMATE);
  });

  it('maps provenance back onto the stored calories_source enum', () => {
    expect(toStoredCaloriesSource(PROVENANCE.MEASURED_DEVICE)).toBe('device');
    expect(toStoredCaloriesSource(PROVENANCE.CALCULATED_ESTIMATE)).toBe('estimated');
    expect(caloriesProvenance('manual')).toBe(PROVENANCE.MEASURED_DEVICE);
    expect(caloriesProvenance('estimated')).toBe(PROVENANCE.CALCULATED_ESTIMATE);
  });
});

describe('athleteState: helpers', () => {
  it('normalises a zone distribution to 100 percent', () => {
    const pct = zoneDistribution([600, 600, 600, 600, 600]);
    expect(pct.reduce((s, v) => s + v, 0)).toBeCloseTo(100, 1);
    expect(pct[0]).toBeCloseTo(20, 1);
  });

  it('returns zeros when no zone time was tracked', () => {
    expect(zoneDistribution(null)).toEqual([0, 0, 0, 0, 0]);
  });

  it('derives speed samples for pace sports and power samples for cycling', () => {
    const run = buildWorkloadSamples(
      [
        { time: 0, speed: 3, heart_rate: 140 },
        { time: 10, speed: 3.2, heart_rate: 141 },
      ],
      'running',
    );
    expect(run[0].value).toBe(3.2);
    const bike = buildWorkloadSamples(
      [
        { time: 0, power: 200, heart_rate: 140 },
        { time: 10, power: 260, heart_rate: 141 },
      ],
      'cycling',
    );
    expect(bike[0].value).toBe(260);
  });
});