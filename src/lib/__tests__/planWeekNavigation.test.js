import { describe, expect, it } from "vitest";
import { choosePlanWeek, localPlanDate } from "../planWeekNavigation";

const weeks = [
  { week_number: 1, days: [{ date: "2026-11-01" }, { date: "2026-11-07" }] },
  { week_number: 2, days: [{ date: "2026-11-08" }, { date: "2026-11-14" }] },
  { week_number: 3, days: [{ date: "2026-11-15" }, { date: "2026-11-21" }] },
];

describe("training plan week navigation", () => {
  it("opens the current date's week even if there is no workout on the day", () => {
    expect(choosePlanWeek(weeks, "2026-11-18")).toBe(3);
    expect(choosePlanWeek(weeks, "2026-11-08")).toBe(2);
  });
  it("opens the next scheduled week when earlier weeks have finished", () => {
    expect(choosePlanWeek(weeks, "2026-11-10")).toBe(2);
    expect(choosePlanWeek(weeks, "2026-10-31")).toBe(1);
  });
  it("opens first week when all weeks are historical and never invents a new week", () => {
    expect(choosePlanWeek(weeks, "2026-12-12")).toBe(1);
    expect(choosePlanWeek([], "2026-11-15")).toBeNull();
    expect(choosePlanWeek(null, "2026-11-15")).toBeNull();
  });
  it("ignores malformed day dates without throwing", () => {
    expect(choosePlanWeek([{ week_number: 4, days: null }, { week_number: 5, days: [{ date: "2026-11-17" }] }], "2026-11-16")).toBe(5);
  });
  it("formats a local calendar date without UTC conversion", () => {
    expect(localPlanDate(new Date(2026, 10, 15, 0, 30))).toBe("2026-11-15");
  });
});
