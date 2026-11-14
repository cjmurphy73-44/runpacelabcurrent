import { describe, expect, it } from "vitest";
import { workoutLoadPresentation } from "../workoutLoadPresentation";

describe("recent workout load provenance", () => {
  it("shows recording-derived load without asserting independent verification", () => {
    expect(workoutLoadPresentation({ session_trimp: 43.6, load_source: "stream" })).toEqual({
      label: "Recording-derived, verification pending", amount: "44 TRIMP", measured: false,
    });
  });
  it("labels summary-derived load as estimated", () => {
    expect(workoutLoadPresentation({ session_trimp: 43.6, load_source: "summary" })).toEqual({
      label: "Estimated from summary", amount: "44 TRIMP", measured: false,
    });
  });
  it("shows TSS in its own unit", () => {
    expect(workoutLoadPresentation({ session_tss: 65, load_source: "summary" }).amount).toBe("65 TSS");
  });
  it("rejects dual-unit records instead of choosing a convenient value", () => {
    expect(workoutLoadPresentation({ session_trimp: 25, session_tss: 50 }).amount).toBe("Load unavailable");
  });
  it("does not manufacture zeros or accept invalid values", () => {
    for (const workout of [{}, { session_trimp: 0 }, { session_trimp: Infinity }, { session_tss: -1 }, { session_trimp: "42" }]) {
      expect(workoutLoadPresentation(workout).amount).toBe("Load unavailable");
    }
  });
  it("does not infer provenance from an unlabelled legacy workout", () => {
    expect(workoutLoadPresentation({ session_trimp: 35 }).label).toBe("Source unverified");
  });
});
