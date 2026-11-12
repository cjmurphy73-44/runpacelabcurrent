import { describe, expect, it } from "vitest";
import { computeInjurySignal } from "../coachInjurySignal";

const now = new Date("2026-11-12T12:00:00Z");
const message = (content_text, created_date) => ({
  content_text,
  created_date,
  message_type: "coach",
});

describe("coach injury signal timestamps", () => {
  it("raises a hold for recent injury guidance", () => {
    const result = computeInjurySignal([
      message("Stop running until your knee injury settles.", "2026-11-11T12:00:00Z"),
    ], { now });
    expect(result.level).toBe("hold");
    expect(result.evidence).toHaveLength(1);
  });

  it("ignores injury messages dated in the future", () => {
    const result = computeInjurySignal([
      message("Stop running due to injury.", "2026-11-13T12:00:00Z"),
    ], { now });
    expect(result.level).toBe("none");
    expect(result.evidence).toHaveLength(0);
  });

  it("does not let future clearance erase an existing hold", () => {
    const result = computeInjurySignal([
      message("Stop running due to injury.", "2026-11-11T12:00:00Z"),
      message("You are cleared to run.", "2026-11-13T12:00:00Z"),
    ], { now });
    expect(result.level).toBe("hold");
    expect(result.clearedByCoach).toBe(false);
  });

  it("allows a valid newer clearance to end the prior hold", () => {
    const result = computeInjurySignal([
      message("Stop running due to injury.", "2026-11-10T12:00:00Z"),
      message("You are cleared to run.", "2026-11-11T12:00:00Z"),
    ], { now });
    expect(result.level).toBe("none");
    expect(result.clearedByCoach).toBe(true);
  });

  it("allows a new injury message after clearance to reactivate a hold", () => {
    const result = computeInjurySignal([
      message("Stop running due to injury.", "2026-11-10T12:00:00Z"),
      message("You are cleared to run.", "2026-11-11T12:00:00Z"),
      message("Stop running with your new knee injury.", "2026-11-12T10:00:00Z"),
    ], { now });
    expect(result.level).toBe("hold");
  });
});
