import { describe, expect, it } from 'vitest';
import { TelemetryParser } from '../../../base44/shared/telemetryParser';
import { parseCsv, parseTcx } from '../../../base44/shared/workoutParsers';

describe('bulk workout validation and matching', () => {
  const walking = {
    athlete_id: 'athlete', date: '2026-06-01', sport: 'walking',
    duration_seconds: 181, distance_km: 0.468,
  };

  it('keeps a walking workout and normalizes its persisted metrics', () => {
    expect(TelemetryParser.sanitize(walking)).toMatchObject({
      ...walking, duration_minutes: 3.02, distance_km: 0.47,
    });
  });

  it('rejects impossible session dates, durations, or distances', () => {
    for (const bad of [
      { date: '2026-06-31' },
      { date: '9999-01-01' },
      { duration_seconds: 0 },
      { duration_seconds: 86401 },
      { distance_km: -1 },
      { distance_km: Infinity },
    ]) {
      expect(TelemetryParser.sanitize({ ...walking, ...bad })).toBeNull();
    }
  });

  it('matches a repeat only against the same day and sport', () => {
    const saved = { '2026-06-01': [{ ...walking, duration_minutes: 3.02 }] };
    expect(TelemetryParser.isDuplicate(saved, walking.date, 'walking', 3.02, 0.47)).toBe(true);
    expect(TelemetryParser.isDuplicate(saved, walking.date, 'running', 3.02, 0.47)).toBe(false);
    expect(TelemetryParser.isDuplicate(saved, '2026-06-02', 'walking', 3.02, 0.47)).toBe(false);
  });

  it('keeps two similar recordings when their original start times differ', () => {
    const start = '2026-06-01T11:00:00.000Z';
    const recorded = { ...walking, duration_minutes: 3.02, recording_started_at: start };
    const saved = { [walking.date]: [recorded] };
    expect(TelemetryParser.isDuplicate(saved, walking.date, 'walking', 3.8, 0.49, '2026-06-01T12:00:00Z')).toBe(false);
    expect(TelemetryParser.isDuplicate(saved, walking.date, 'walking', 3.02, 0.47, start)).toBe(true);
    expect(TelemetryParser.isDuplicate(saved, walking.date, 'walking', 3.02, 0.47)).toBe(true);
  });
});

it.each([
  ['distance_m', 456],
  ['distance_km', 0.456],
  ['distance', 0.456],
])('stores CSV %s samples in metres and the session total in kilometres', (header, distance) => {
  const parsed = parseCsv(`time,${header}\n0,0\n152,${distance}`);
  expect(parsed?.stream.at(-1)?.distance).toBeCloseTo(456, 5);
  expect(parsed?.summary.distance_km).toBe(0.46);
  expect(parsed?.summary.recording_started_at).toBeNull();
});

it('keeps the original start for a timestamped CSV recording', () => {
  const parsed = parseCsv('timestamp,distance_m\n2026-06-01T10:00:00Z,0\n2026-06-01T10:02:32Z,456');
  expect(parsed?.summary.recording_started_at).toBe('2026-06-01T10:00:00.000Z');
});

it('extracts the date, samples and lap from a TCX workout', () => {
  const parsed = parseTcx(`
    <Lap StartTime="2026-06-01T09:00:00Z">
      <TotalTimeSeconds>152</TotalTimeSeconds><DistanceMeters>456</DistanceMeters>
      <Track>
        <Trackpoint><Time>2026-06-01T09:00:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint>
        <Trackpoint><Time>2026-06-01T09:02:32Z</Time><DistanceMeters>456</DistanceMeters></Trackpoint>
      </Track>
    </Lap>
  `);
  expect(parsed?.summary).toMatchObject({
    derived_date: '2026-06-01', recording_started_at: '2026-06-01T09:00:00.000Z', duration_seconds: 152, distance_km: 0.46,
  });
  expect(parsed?.laps).toHaveLength(1);
  expect(parsed?.stream.at(-1)?.distance).toBe(456);
});
