import { describe, expect, it } from "vitest";
import { sessionsOnDay, calendarDayLabel } from "../calendarDaySessions";

describe("training calendar day grouping", () => {
  const sessions = [
    { id: "run", date: "2026-11-15", sport: "running" },
    { id: "ride", date: "2026-11-15", sport: "cycling" },
    { id: "swim", date: "2026-11-16", sport: "swimming" },
  ];
  it("preserves two sessions on the same date", () => {
    expect(sessionsOnDay(sessions, "2026-11-15").map((s) => s.id)).toEqual(["run", "ride"]);
  });
  it("does not relabel a missing day as a confirmed rest prescription", () => {
    expect(calendarDayLabel(sessions, "2026-11-17", true)).toBe("No session scheduled");
  });
  it("does not claim a rest day if the calendar could not load", () => {
    expect(calendarDayLabel([], "2026-11-17", false)).toBe("Schedule unavailable");
  });
  it("rejects malformed inputs", () => {
    expect(sessionsOnDay(null, "2026-11-15")).toEqual([]);
    expect(sessionsOnDay(sessions, "tomorrow")).toEqual([]);
  });
});
