import { describe, expect, it } from "vitest";
import { dashboardLoadGate } from "../dashboardLoadGate";

const valid = { date: "2026-11-12", session_trimp: 43, load_source: "stream", stream_verified: true };
describe("dashboard banner load gate", () => {
  it("accepts an explicitly verified comparable stream series", () => {
    expect(dashboardLoadGate([valid, { ...valid, date: "2026-11-13", session_trimp: 30 }])).toEqual({ ready: true, unit: "TRIMP" });
  });
  it("does not infer verification from source alone", () => {
    expect(dashboardLoadGate([{ ...valid, stream_verified: undefined }]).ready).toBe(false);
  });
  it("rejects summary, missing, mixed and invalid loads", () => {
    const bad = [
      [], [{ ...valid, load_source: "summary" }], [{ ...valid, session_tss: 55 }],
      [{ ...valid, session_trimp: 0 }], [{ ...valid, session_trimp: "43" }],
      [valid, { ...valid, session_trimp: undefined, session_tss: 40 }],
      [{ ...valid, date: "not-a-date" }],
    ];
    for (const workouts of bad) expect(dashboardLoadGate(workouts).ready).toBe(false);
  });
});
