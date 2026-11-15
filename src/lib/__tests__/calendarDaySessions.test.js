import { describe, expect, it } from "vitest";
import { calendarDayState, sessionsForCalendarDay } from "../calendarDaySessions";

const day = "2026-11-15";
const sessions = [
  { id: "run", date: day, sport: "running", start_time: "07:00" },
  { id: "ride", date: day, sport: "cycling", start_time: "17:30" },
  { id: "next", date: "2026-11-16", sport: "swimming" },
];

describe("athlete calendar day session coverage", () => {
  it("returns both workouts for a double-session day in start-time order", () => {
    expect(sessionsForCalendarDay([sessions[1], sessions[2], sessions[0]], day).map(s => s.id))
      .toEqual(["run", "ride"]);
  });
  it("never labels a failed or missing response as rest", () => {
    expect(calendarDayState({ sessions: [], date: day, failed: true }).kind).toBe("unavailable");
    expect(calendarDayState({ sessions: undefined, date: day }).kind).toBe("unavailable");
    expect(calendarDayState({ sessions: [], date: day, loading: true }).kind).toBe("loading");
  });
  it("labels a no-session day only after a successful confirmed list", () => {
    expect(calendarDayState({ sessions, date: "2026-11-17" })).toEqual({ kind: "rest", sessions: [] });
    expect(calendarDayState({ sessions, date: day }).sessions).toHaveLength(2);
  });
  it("ignores null entries and records for other days", () => {
    expect(sessionsForCalendarDay([null, ...sessions], day).map(s => s.id)).toEqual(["run", "ride"]);
  });
});
