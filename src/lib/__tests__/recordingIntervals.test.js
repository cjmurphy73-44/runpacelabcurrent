import { describe, expect, it } from "vitest";
import { recordingIntervals } from "../recordingIntervals";

function syntheticWorkout(count = 1201, distance = true) {
  return {
    duration_seconds: count - 1,
    streams: Array.from({ length: count }, (_, time) => ({
      time,
      heart_rate: time < 600 ? 120 : 150,
      distance: distance ? time * 5 : null,
      speed: distance ? 5 : null,
    })),
  };
}
describe("verified time-based recording intervals", () => {
  it("produces measured 10-minute windows with HR, distance and speed", () => {
    const result = recordingIntervals(syntheticWorkout());
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ startSeconds: 0, durationSeconds: 600, distanceKm: 3, avgSpeedKmh: 18 });
    expect(result[1]).toMatchObject({ startSeconds: 600, durationSeconds: 600, distanceKm: 3, avgSpeedKmh: 18, avgHr: 150 });
  });
  it("does not invent distance or speed when no distance/speed channel exists", () => {
    const rows = recordingIntervals(syntheticWorkout(601, false));
    expect(rows[0]).toMatchObject({ distanceKm: null, avgSpeedKmh: null });
    expect(rows[0].avgHr).toBeGreaterThan(0);
  });
  it("rejects summary or sparse telemetry and unsupported windows", () => {
    expect(recordingIntervals({ duration_seconds: 3600, streams: [{ time: 0, heart_rate: 150 }] })).toEqual([]);
    expect(recordingIntervals(syntheticWorkout(), 700)).toEqual([]);
  });
  it("does not bridge recording gaps or count missing HR as zero", () => {
    const session = syntheticWorkout(601);
    session.streams = session.streams.filter(p => p.time < 200 || p.time > 400);
    const rows = recordingIntervals(session);
    expect(rows[0].hrCoverage).toBeLessThan(0.8);
    expect(rows[0].avgHr).toBeNull();
  });
});
