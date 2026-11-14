import { describe, expect, it } from "vitest";
import { singleImportOutcome } from "../singleImportOutcome";

describe("single-file import confirmation", () => {
  it("requires persisted workout identity, not just a resolved request", () => {
    for (const value of [null, {}, { success: true }, { data: { success: true } }, { data: { success: false, workout_session_id: "abc" } }]) {
      expect(singleImportOutcome(value).ok).toBe(false);
    }
  });
  it("accepts confirmed new session from ingestWorkoutFile", () => {
    expect(singleImportOutcome({ data: { success: true, workout_session: { id: "synthetic-session" }, attached: false } }))
      .toMatchObject({ ok: true, attached: false });
  });
  it("distinguishes attachment to an existing workout", () => {
    const outcome = singleImportOutcome({ data: { success: true, attached: true, workout_session_id: "synthetic-session" } });
    expect(outcome.ok).toBe(true);
    expect(outcome.message).toContain("attached");
  });
  it("surfaces backend error and never asserts saved samples", () => {
    expect(singleImportOutcome({ data: { error: "Parse failed" } })).toMatchObject({ ok: false, message: "Parse failed" });
    expect(singleImportOutcome({ success: true, workout_session_id: "synthetic" }).message).toContain("check saved sample coverage");
  });
});
