import { describe, expect, it } from "vitest";
import { parseTcx } from "../../../base44/shared/workoutParsers.ts";
import { hasVerifiedStreams } from "../streamValidity";

// Entirely synthetic one-hertz TCX fixture; no real athlete data or network.
const makeTcx = (seconds, mutate = (s) => s) => {
  const start = Date.parse("2026-11-01T07:00:00.000Z");
  const points = Array.from({ length: seconds }, (_, i) => {
    const t = mutate(i);
    return `<Trackpoint><Time>${new Date(start + t * 1000).toISOString()}</Time><HeartRateBpm><Value>145</Value></HeartRateBpm><DistanceMeters>${i * 2.5}</DistanceMeters></Trackpoint>`;
  }).join("");
  return `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Running"><Lap StartTime="2026-11-01T07:00:00.000Z"><TotalTimeSeconds>${seconds}</TotalTimeSeconds><DistanceMeters>${seconds * 2.5}</DistanceMeters><Track>${points}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
};

describe("TCX parser timestamp integrity", () => {
  it("parses a synthetic dense recording with genuine stream and lap evidence", () => {
    const parsed = parseTcx(makeTcx(90));
    expect(parsed?.stream).toHaveLength(90);
    expect(parsed?.laps).toHaveLength(1);
    expect(hasVerifiedStreams({ streams: parsed.stream, duration_seconds: 90 })).toBe(true);
  });
  it("rejects repeated timestamps instead of silently producing a fake timeline", () => {
    expect(parseTcx(makeTcx(90, i => i === 40 ? 39 : i))).toBeNull();
  });
  it("rejects backward timestamps instead of silently sorting samples", () => {
    expect(parseTcx(makeTcx(90, i => i === 40 ? 12 : i))).toBeNull();
  });
  it("rejects missing trackpoints", () => {
    expect(parseTcx("<TrainingCenterDatabase><Lap><TotalTimeSeconds>90</TotalTimeSeconds></Lap></TrainingCenterDatabase>")).toBeNull();
  });
});
