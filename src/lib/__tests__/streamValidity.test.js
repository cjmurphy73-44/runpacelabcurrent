import { describe, expect, it } from "vitest";
import { hasVerifiedStreams, analyticsEligible } from "../streamValidity";

const stream = (count = 121, step = 1) =>
  Array.from({ length: count }, (_, i) => ({ time: i * step, heart_rate: 140 }));

describe("verified telemetry gate", () => {
  it("accepts a dense measured recording", () => {
    const session = { duration_seconds: 120, streams: stream() };
    expect(hasVerifiedStreams(session)).toBe(true);
    expect(analyticsEligible(session)).toBe(true);
  });

  it("rejects a handful of points from an activity summary", () => {
    expect(hasVerifiedStreams({ duration_seconds: 120, streams: stream(10, 12) })).toBe(false);
  });

  it("rejects duplicate or out-of-order timestamps", () => {
    const duplicated = stream();
    duplicated[20].time = duplicated[19].time;
    expect(hasVerifiedStreams({ duration_seconds: 120, streams: duplicated })).toBe(false);
    const unordered = stream();
    unordered[20].time = 18;
    expect(hasVerifiedStreams({ duration_seconds: 120, streams: unordered })).toBe(false);
  });

  it("rejects sparse timestamps even with many measured points", () => {
    expect(hasVerifiedStreams({ duration_seconds: 1200, streams: stream(101, 10) })).toBe(false);
  });

  it("rejects missing physiological channels and incomplete coverage", () => {
    const unmeasured = stream().map(({ time }) => ({ time, heart_rate: null }));
    expect(hasVerifiedStreams({ duration_seconds: 120, streams: unmeasured })).toBe(false);
    expect(hasVerifiedStreams({ duration_seconds: 3600, streams: stream() })).toBe(false);
  });

  it("rejects complementary sparse channels even when combined coverage exceeds half", () => {
    const mixed = Array.from({ length: 121 }, (_, i) => ({
      time: i,
      heart_rate: i < 45 ? 140 : null,
      power: i >= 45 && i < 90 ? 200 : null,
    }));
    expect(hasVerifiedStreams({ duration_seconds: 120, streams: mixed })).toBe(false);
  });

  it("rejects numeric-string and non-finite physiological measurements", () => {
    const strings = stream().map(p => ({ ...p, heart_rate: "140" }));
    const infinite = stream().map(p => ({ ...p, heart_rate: Infinity }));
    expect(hasVerifiedStreams({ duration_seconds: 120, streams: strings })).toBe(false);
    expect(hasVerifiedStreams({ duration_seconds: 120, streams: infinite })).toBe(false);
  });

  it("accepts a measured single channel at the exact half-coverage threshold", () => {
    const power = Array.from({ length: 120 }, (_, i) => ({ time: i + 1, power: i < 60 ? 210 : null }));
    expect(hasVerifiedStreams({ duration_seconds: 120, streams: power })).toBe(true);
  });

  it("rejects invalid timestamps rather than claiming measured time in zone", () => {
    const bad = stream();
    bad[7].time = "invalid";
    expect(analyticsEligible({ duration_seconds: 120, streams: bad })).toBe(false);
  });
});
