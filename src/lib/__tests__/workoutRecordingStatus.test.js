import { describe, expect, it } from "vitest";
import { workoutRecordingStatus } from "../workoutRecordingStatus";

const samples = Array.from({ length: 90 }, (_, i) => ({ time: i, heart_rate: 140 }));
describe("workout recording status", () => {
  it("shows usable saved samples without claiming provider sync or original-file retention", () => {
    const result = workoutRecordingStatus({ streams: samples, duration_seconds: 90, load_source: "stream" });
    expect(result.state).toBe("usable");
    expect(result.action).toBe(null);
    expect(result.detail).toContain("does not confirm the original file");
  });
  it("shows partial coverage and an import action", () => {
    const result = workoutRecordingStatus({ streams: samples, duration_seconds: 130 });
    expect(result.state).toBe("partial");
    expect(result.action).toBe("/import");
    expect(result.detail).toContain("approximately 68%");
  });
  it("does not equate summary provenance or a provider label with saved samples", () => {
    const result = workoutRecordingStatus({ source_format: "garmin", load_source: "stream", session_trimp: 60 });
    expect(result.state).toBe("missing");
    expect(result.detail).toContain("unconfirmed");
  });
  it("rejects sparse or malformed saved streams as analysis-ready", () => {
    const sparse = samples.map((point, i) => ({ ...point, time: i * 10 }));
    expect(workoutRecordingStatus({ streams: sparse, duration_seconds: 900 }).state).toBe("partial");
    expect(workoutRecordingStatus({ streams: [{ time: 0 }], duration_seconds: 90 }).state).toBe("missing");
  });
});
