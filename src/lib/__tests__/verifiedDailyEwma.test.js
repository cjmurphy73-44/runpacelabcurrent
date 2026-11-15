import { describe, expect, it } from "vitest";
import { verifiedDailyEwma } from "../verifiedDailyEwma";

const day = { date: "2026-11-12", trimp: 42, unit: "TRIMP", complete: true };
describe("verified 42/7 daily EWMA", () => {
  it("initializes from first observed day and computes exact 42/7 updates", () => {
    const result = verifiedDailyEwma([day, { ...day, date: "2026-11-13", trimp: 0 }]);
    expect(result.ok).toBe(true);
    expect(result.points[0]).toMatchObject({ ctl: 42, atl: 42, tsb: 0 });
    expect(result.points[1].ctl).toBeCloseTo(42 * Math.exp(-1 / 42), 3);
    expect(result.points[1].atl).toBeCloseTo(42 * Math.exp(-1 / 7), 3);
    expect(result.points[1].tsb).toBeGreaterThan(0);
  });
  it("permits a zero-load rest day only when explicitly complete", () => {
    expect(verifiedDailyEwma([day, { ...day, date: "2026-11-13", trimp: 0, complete: false }]).ok).toBe(false);
    expect(verifiedDailyEwma([day, { ...day, date: "2026-11-13", trimp: 0 }]).ok).toBe(true);
  });
  it("rejects calendar gaps and duplicate dates without partial points", () => {
    for (const date of ["2026-11-14", "2026-11-12"]) {
      expect(verifiedDailyEwma([day, { ...day, date }])).toMatchObject({ ok: false, points: [] });
    }
  });
  it("rejects nonfinite load, mixed units, invalid dates and incomplete evidence", () => {
    for (const patch of [
      { trimp: NaN }, { trimp: -1 }, { unit: "TSS" }, { complete: undefined },
      { date: "2026-02-30" },
    ]) expect(verifiedDailyEwma([{ ...day, ...patch }]).ok).toBe(false);
  });
  it("does not mutate input or accept absent history", () => {
    const input = [{ ...day, date: "2026-11-13" }, day];
    expect(verifiedDailyEwma(input).ok).toBe(true);
    expect(input[0].date).toBe("2026-11-13");
    expect(verifiedDailyEwma([]).ok).toBe(false);
  });
});
