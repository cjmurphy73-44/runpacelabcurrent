import { describe, expect, it } from "vitest";
import { comparableDailyTrimp } from "../comparableDailyTrimp";

const session = { date: "2026-11-12", session_trimp: 40, session_tss: 0, load_source: "stream", load_coverage_pct: 85 };
describe("comparable daily TRIMP reconciliation", () => {
  it("sums same-day stream TRIMP, sorts dates and preserves the unit", () => {
    expect(comparableDailyTrimp([
      { ...session, date: "2026-11-13", session_trimp: 10 },
      session,
      { ...session, session_trimp: 2.25 },
    ])).toEqual({ ok: true, unit: "TRIMP", gapPolicy: "unknown", days: [
      { date: "2026-11-12", trimp: 42.25, unit: "TRIMP" },
      { date: "2026-11-13", trimp: 10, unit: "TRIMP" },
    ] });
  });
  it("does not treat a missing day as a known rest day", () => {
    const result = comparableDailyTrimp([session, { ...session, date: "2026-11-14" }]);
    expect(result.days).toHaveLength(2);
    expect(result.gapPolicy).toBe("unknown");
  });
  it("rejects summary estimates and missing coverage", () => {
    for (const changed of [{ load_source: "summary" }, { load_coverage_pct: 29 }, { load_coverage_pct: undefined }]) {
      expect(comparableDailyTrimp([{ ...session, ...changed }]).ok).toBe(false);
    }
  });
  it("rejects mixed units, invalid loads and invalid dates without partial results", () => {
    for (const changed of [
      { session_tss: 25 }, { session_trimp: 0 }, { session_trimp: Infinity },
      { session_trimp: "40" }, { date: "2026-02-30" }, { date: "not-a-date" },
    ]) {
      expect(comparableDailyTrimp([session, { ...session, ...changed }])).toMatchObject({ ok: false, days: [] });
    }
  });
  it("fails closed for absent history", () => {
    expect(comparableDailyTrimp([]).ok).toBe(false);
    expect(comparableDailyTrimp(null).ok).toBe(false);
  });
});
