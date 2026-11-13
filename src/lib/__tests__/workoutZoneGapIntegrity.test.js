import { describe, expect, it } from "vitest";
import { computeHrZoneDistribution, sessionZoneDistribution } from "../workoutAnalytics";

function workout() {
  // Deterministic synthetic device samples. HR 140 bpm is a Z3 reading for
  // the 60/180 bpm HRR profile (Z3 floor 144 is close; measured time matters).
  return {
    duration_seconds: 600,
    streams: Array.from({ length: 601 }, (_, time) => ({
      time, heart_rate: 150, power: 0,
    })),
  };
}
const athlete = { resting_hr: 60, max_heart_rate: 180 };
const total = (result) => result.totalSeconds;

describe("workout zone time never invents missing HR or filled gaps", () => {
  it("counts dense measured HR only", () => {
    const result = sessionZoneDistribution(workout(), athlete);
    expect(result.method).toBe("stream");
    expect(total(result)).toBe(600);
  });

  it("excludes missing sensor readings even when nearby samples are valid", () => {
    const session = workout();
    for (let i = 101; i <= 200; i++) session.streams[i].heart_rate = null;
    const result = sessionZoneDistribution(session, athlete);
    expect(result.method).toBe("stream");
    expect(total(result)).toBe(500);
    expect(result.zones.reduce((sum, z) => sum + z.seconds, 0)).toBe(500);
  });

  it("does not turn a 120-second recording dropout into a zone observation", () => {
    const session = workout();
    session.streams = session.streams.filter(p => p.time <= 200 || p.time >= 320);
    const result = sessionZoneDistribution(session, athlete);
    expect(result.method).toBe("stream");
    expect(total(result)).toBe(480);
    expect(result.zones.reduce((sum, z) => sum + z.seconds, 0)).toBe(480);
  });

  it("rejects implausible HR values instead of assigning a zone", () => {
    const session = workout();
    session.streams[200].heart_rate = 999;
    session.streams[201].heart_rate = 0;
    const result = sessionZoneDistribution(session, athlete);
    expect(total(result)).toBe(598);
  });

  it("will not manufacture percent-of-max zones from summary-only sessions", () => {
    const summary = { duration_seconds: 600, avg_hr: 150, streams: [] };
    expect(computeHrZoneDistribution(summary, 180).map(x => x.pct)).toEqual([0, 0, 0, 0, 0]);
    expect(sessionZoneDistribution(summary, athlete)).toMatchObject({ method: "none", totalSeconds: 0 });
  });

  it("uses the same measured-time-only rule in the legacy percentage helper", () => {
    const session = workout();
    // A valid HR stream remains eligible; only the invalid/absent readings
    // are omitted from percentages and the rest is normalised.
    session.streams = session.streams.filter(p => p.time <= 200 || p.time >= 320);
    session.streams[400].heart_rate = null;
    expect(computeHrZoneDistribution(session, 180).reduce((sum, x) => sum + x.pct, 0))
      .toBeCloseTo(100, 8);
    const allMissing = workout();
    allMissing.streams.forEach(p => { p.heart_rate = null; p.power = 0; });
    expect(computeHrZoneDistribution(allMissing, 180).map(x => x.pct)).toEqual([0, 0, 0, 0, 0]);
  });
});
