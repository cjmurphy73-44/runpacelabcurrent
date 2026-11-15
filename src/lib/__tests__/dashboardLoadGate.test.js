import { describe, expect, it } from "vitest";
import { dashboardLoadGate } from "../dashboardLoadGate";

const valid = { date: "2026-11-12", session_trimp: 43, session_tss: 0, load_source: "stream", load_coverage_pct: 82 };
describe("dashboard banner persisted load contract", () => {
  it("accepts backend-integrated TRIMP with default-zero unused TSS", () => {
    expect(dashboardLoadGate([valid, { ...valid, date: "2026-11-13", session_trimp: 30 }])).toEqual({ ready: true, unit: "TRIMP" });
  });
  it("accepts legacy missing unused TSS but never positive TSS", () => {
    expect(dashboardLoadGate([{ ...valid, session_tss: undefined }]).ready).toBe(true);
    expect(dashboardLoadGate([{ ...valid, session_tss: 50 }]).ready).toBe(false);
  });
  it("rejects summary load, absent coverage, and insufficient coverage", () => {
    for (const w of [
      { ...valid, load_source: "summary" },
      { ...valid, load_coverage_pct: undefined },
      { ...valid, load_coverage_pct: 29 },
      { ...valid, load_coverage_pct: 101 },
    ]) expect(dashboardLoadGate([w]).ready).toBe(false);
  });
  it("rejects missing, invalid, zero or mixed units", () => {
    for (const w of [
      { ...valid, session_trimp: 0 },
      { ...valid, session_trimp: Infinity },
      { ...valid, session_trimp: "43" },
      { ...valid, session_tss: -1 },
      { ...valid, date: "invalid" },
    ]) expect(dashboardLoadGate([w]).ready).toBe(false);
    expect(dashboardLoadGate([]).ready).toBe(false);
  });
});
