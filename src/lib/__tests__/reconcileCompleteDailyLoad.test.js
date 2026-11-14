import { describe, expect, it } from "vitest";
import { reconcileCompleteDailyLoad } from "../reconcileCompleteDailyLoad";

const load = { date: "2026-11-12", trimp: 42, unit: "TRIMP" };
const proof = { date: "2026-11-12", source: "server_reconciliation", status: "complete", pending: 0, failed: 0, expectedActivities: 1, persistedActivities: 1 };
describe("daily completeness evidence", () => {
  it("accepts matching server-reconciled activity counts", () => {
    expect(reconcileCompleteDailyLoad([load], [proof])).toEqual({
      ok: true, days: [{ ...load, complete: true }], evidence: "server-reconciled-input",
    });
  });
  it("requires explicit rest confirmation for empty days", () => {
    const rest = { ...load, trimp: 0 };
    const empty = { ...proof, expectedActivities: 0, persistedActivities: 0 };
    expect(reconcileCompleteDailyLoad([rest], [empty]).ok).toBe(false);
    expect(reconcileCompleteDailyLoad([rest], [{ ...empty, restDayConfirmed: true }]).ok).toBe(true);
  });
  it("rejects pending, failed, mismatched and browser-asserted reconciliation", () => {
    for (const changed of [
      { pending: 1 }, { failed: 1 }, { persistedActivities: 0 },
      { source: "browser" }, { status: "partial" }, { expectedActivities: -1 },
    ]) expect(reconcileCompleteDailyLoad([load], [{ ...proof, ...changed }]).ok).toBe(false);
  });
  it("rejects missing evidence, mismatched dates and calendar gaps", () => {
    expect(reconcileCompleteDailyLoad([load], []).ok).toBe(false);
    expect(reconcileCompleteDailyLoad([load], [{ ...proof, date: "2026-11-13" }]).ok).toBe(false);
    expect(reconcileCompleteDailyLoad([
      load, { ...load, date: "2026-11-14" },
    ], [proof, { ...proof, date: "2026-11-14" }])).toMatchObject({ ok: false, days: [] });
  });
  it("rejects impossible rest/activity totals and invalid units", () => {
    expect(reconcileCompleteDailyLoad([{ ...load, trimp: 0 }], [proof]).ok).toBe(false);
    expect(reconcileCompleteDailyLoad([{ ...load, unit: "TSS" }], [proof]).ok).toBe(false);
    expect(reconcileCompleteDailyLoad([{ ...load, trimp: Infinity }], [proof]).ok).toBe(false);
  });
});
