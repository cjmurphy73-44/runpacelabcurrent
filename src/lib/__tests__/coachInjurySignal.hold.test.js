import { describe, expect, it } from "vitest";
import { computeInjurySignal, describeSource } from "../coachInjurySignal";

const now = new Date("2026-11-12T12:00:00Z");
const msg = (content_text, created_date, message_type = "coach") => ({
  content_text,
  created_date,
  message_type,
});

describe("coach hold derivation", () => {
  it("1. shows a hold for current injury guidance with its evidence and source", () => {
    const result = computeInjurySignal(
      [msg("Your knee injury needs a full stop. No running for two weeks.", "2026-11-11T08:00:00Z")],
      { now }
    );
    expect(result.level).toBe("hold");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].source).toBe("Coach message");
    expect(result.evidence[0].date).toBe("2026-11-11T08:00:00Z");
    expect(result.summary).toContain("paused running");
    expect(result.holdReason).toBe(result.summary);
  });

  it("2. a valid newer clearance resolves an older hold", () => {
    const result = computeInjurySignal(
      [
        msg("Stop running, your Achilles is injured.", "2026-11-05T08:00:00Z"),
        msg("You are cleared to run again. Start with easy jogging.", "2026-11-10T08:00:00Z"),
      ],
      { now }
    );
    expect(result.level).toBe("none");
    expect(result.clearedByCoach).toBe(true);
    expect(result.clearedAt).toBe("2026-11-10T08:00:00.000Z");
  });

  it("3. older injury messages cannot reactivate an already-cleared hold", () => {
    const result = computeInjurySignal(
      [msg("Stop running, your shin splint is flaring.", "2026-11-08T08:00:00Z")],
      { now, clearedAt: "2026-11-11T09:00:00Z" }
    );
    expect(result.level).toBe("none");
    expect(result.evidence).toHaveLength(0);
    expect(result.clearedAt).toBe("2026-11-11T09:00:00.000Z");
    expect(result.clearedByCoach).toBe(false);
  });

  it("4. a newer injury warning after a clearance reactivates the hold", () => {
    const result = computeInjurySignal(
      [
        msg("Stop running, your shin splint is flaring.", "2026-11-01T08:00:00Z"),
        msg("You are cleared to run again.", "2026-11-05T08:00:00Z"),
        msg("New niggle in the left calf. Stop running until we review it.", "2026-11-12T09:00:00Z"),
      ],
      { now }
    );
    expect(result.level).toBe("hold");
    expect(result.evidence[0].date).toBe("2026-11-12T09:00:00Z");
  });

  it("6. future-dated and invalid messages never change the hold status", () => {
    const future = computeInjurySignal(
      [msg("Stop running, injury.", "2026-11-14T08:00:00Z")],
      { now }
    );
    expect(future.level).toBe("none");

    const invalid = computeInjurySignal(
      [msg("Stop running, injury.", "not-a-date")],
      { now }
    );
    expect(invalid.level).toBe("none");

    const futureClearance = computeInjurySignal(
      [
        msg("Stop running, injury.", "2026-11-11T08:00:00Z"),
        msg("You are cleared to run.", "2026-12-01T08:00:00Z"),
      ],
      { now }
    );
    expect(futureClearance.level).toBe("hold");
    expect(futureClearance.clearedByCoach).toBe(false);
  });

  it("6b. a future-dated or invalid athlete clearance timestamp cannot clear a hold", () => {
    const futureCleared = computeInjurySignal(
      [msg("Stop running, injury.", "2026-11-11T08:00:00Z")],
      { now, clearedAt: "2026-12-01T00:00:00Z" }
    );
    expect(futureCleared.level).toBe("hold");

    const invalidCleared = computeInjurySignal(
      [msg("Stop running, injury.", "2026-11-11T08:00:00Z")],
      { now, clearedAt: "whenever" }
    );
    expect(invalidCleared.level).toBe("hold");
  });

  it("does not treat a negative clearance phrase as a clearance", () => {
    const result = computeInjurySignal(
      [msg("You are not cleared to run yet after the injury.", "2026-11-11T08:00:00Z")],
      { now }
    );
    expect(result.level).toBe("hold");
    expect(result.clearedAt).toBeNull();
  });

  it("9. an empty conversation is no hold, and never a clearance", () => {
    const result = computeInjurySignal([], { now });
    expect(result.level).toBe("none");
    expect(result.clearedAt).toBeNull();
    expect(result.evidence).toEqual([]);
  });

  it("raises caution for older wording and never a hold", () => {
    const result = computeInjurySignal(
      [msg("Knee is a bit sore, monitor it and back off if it persists.", "2026-11-04T08:00:00Z")],
      { now }
    );
    expect(result.level).toBe("caution");
  });

  it("describes evidence sources for the card", () => {
    expect(describeSource("coach")).toBe("Coach message");
    expect(describeSource("plan_generation")).toContain("plan generation");
    expect(describeSource(undefined)).toBe("Coach conversation");
  });
});