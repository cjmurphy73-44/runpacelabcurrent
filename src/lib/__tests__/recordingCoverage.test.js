import { describe, expect, it } from "vitest";
import { recordingCoverage } from "../recordingCoverage";

describe("persisted recording coverage", () => {
  it("flags the first 3600 points of an 84-minute workout as incomplete", () => {
    const result = recordingCoverage({
      duration_seconds: 5040,
      streams: Array.from({ length: 3600 }, (_, time) => ({ time, heart_rate: 155 })),
    });
    expect(result).toMatchObject({ sampleCount: 3600, partial: true, percent: 71 });
    expect(result.savedSeconds).toBe(3599);
  });
  it("does not count missing samples as recorded time", () => {
    const result = recordingCoverage({
      duration_seconds: 500,
      streams: [
        ...Array.from({ length: 100 }, (_, time) => ({ time })),
        ...Array.from({ length: 101 }, (_, i) => ({ time: i + 400 })),
      ],
    });
    expect(result.savedSeconds).toBe(199);
    expect(result.partial).toBe(true);
  });
  it("does not issue a false warning for nearly complete valid data", () => {
    expect(recordingCoverage({
      duration_seconds: 600,
      streams: Array.from({ length: 600 }, (_, time) => ({ time })),
    })?.partial).toBe(false);
  });
  it("returns unavailable for invalid timestamps or missing duration", () => {
    expect(recordingCoverage({ duration_seconds: 300, streams: [{ time: 0 }, { time: 0 }] })).toBeNull();
    expect(recordingCoverage({ streams: [{ time: 0 }, { time: 1 }] })).toBeNull();
    expect(recordingCoverage({ duration_seconds: 300, streams: [] })).toBeNull();
  });
});
