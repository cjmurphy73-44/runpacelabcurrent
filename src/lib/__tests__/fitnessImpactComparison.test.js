import { describe, expect, it } from "vitest";
import { findPreviousDayMetrics, previousCalendarDate } from "../fitnessImpactComparison";
describe("daily fitness curve comparison", () => {
  it("hides multi-day changes rather than calling them yesterday's delta", () => {
    expect(findPreviousDayMetrics([{ date: "2026-11-13" }, { date: "2026-11-11", calculated_ctl: 27 }], "2026-11-13")).toBeNull();
  });
  it("selects only the immediately preceding calendar day", () => {
    const rows = [{ date: "2026-11-11" }, { date: "2026-11-12", calculated_ctl: 49 }];
    expect(findPreviousDayMetrics(rows, "2026-11-13")?.calculated_ctl).toBe(49);
  });
  it("handles leap days, year boundaries and malformed dates", () => {
    expect(previousCalendarDate("2026-03-01")).toBe("2026-02-28");
    expect(previousCalendarDate("2024-03-01")).toBe("2024-02-29");
    expect(previousCalendarDate("2026-01-01")).toBe("2025-12-31");
    expect(previousCalendarDate("2026-13-01")).toBeNull();
  });
});
