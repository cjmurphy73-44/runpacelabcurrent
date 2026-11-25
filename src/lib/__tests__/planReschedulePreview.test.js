import { describe, expect, it } from "vitest";
import { previewPlanSessionMove } from "../planReschedulePreview";

const original = Object.freeze({
  id: "pending-one", training_plan_id: "plan-one", athlete_id: "athlete-one",
  date: "2026-11-15", sport: "running", status: "pending",
});
const context = Object.freeze({
  athleteId: "athlete-one", today: "2026-11-15", calendarEnd: "2026-11-21",
});
const check = (extra = {}) => previewPlanSessionMove({
  session: original, sessions: [original],
  destination: "2026-11-17", ...context, ...extra,
});

describe("unsaved, fail-closed planned-session move preview", () => {
  it("returns a preview with original and target dates but no save authorization", () => {
    const result = check();
    expect(result).toMatchObject({
      ok: true, saved: false, from: "2026-11-15", to: "2026-11-17",
      sessionId: "pending-one", athleteId: "athlete-one", trainingPlanId: "plan-one",
    });
    expect(original.date).toBe("2026-11-15");
    expect(result).not.toHaveProperty("authorized");
  });
  it.each(["completed", "partial", "excess", "skipped", "modified"])(
    "rejects non-pending actual outcome %s", status => {
      expect(check({ session: { ...original, status } }).ok).toBe(false);
    },
  );
  it("rejects cross-athlete, missing ID and wrong-plan session references", () => {
    expect(check({ athleteId: "other-athlete" }).ok).toBe(false);
    expect(check({ session: { ...original, id: "" } }).ok).toBe(false);
    expect(check({ session: { ...original, training_plan_id: "foreign-plan" } }).ok).toBe(false);
    expect(check({ sessions: null }).ok).toBe(false);
  });
  it.each(["2026-02-30", "2026-11-31", "2026-11-1", "2026-11-15T00:00", "garbage", ""])(
    "rejects an invalid proposed date: %s", destination => {
      expect(check({ destination }).ok).toBe(false);
    },
  );
  it.each(["2026-11-14", "2026-11-22", "2026-11-15"])(
    "rejects past, outside-week or same-day move %s", destination => {
      expect(check({ destination }).ok).toBe(false);
    },
  );
  it("rejects a conflicting pending workout of same sport and day", () => {
    const other = { ...original, id: "pending-two", date: "2026-11-17" };
    const result = check({ sessions: [original, other] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/another pending session/i);
  });
  it("permits a preview beside another sport without modifying either workout", () => {
    const strength = { ...original, id: "strength", sport: "strength", date: "2026-11-17" };
    const result = check({ sessions: [original, strength] });
    expect(result.ok).toBe(true);
    expect(strength.date).toBe("2026-11-17");
  });
});
