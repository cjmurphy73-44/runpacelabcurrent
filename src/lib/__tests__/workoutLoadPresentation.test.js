import { describe, expect, it } from "vitest";
import { workoutLoadPresentation } from "../workoutLoadPresentation";

describe("workout load provenance", () => {
  it("labels per-second-derived load as measured", () => {
    expect(workoutLoadPresentation({ session_trimp: 43.6, load_source: "stream" })).toEqual({
      label: "Measured recording", amount: "44 TRIMP", measured: true,
    });
  });

  it("labels average-based load as estimated, not measured", () => {
    expect(workoutLoadPresentation({ session_trimp: 43.6, load_source: "summary" })).toEqual({
      label: "Estimated from summary", amount: "44 TRIMP", measured: false,
    });
  });

  it("does not turn missing load into a misleading zero measurement", () => {
    expect(workoutLoadPresentation({ load_source: "none" }).amount).toBe("Load unavailable");
    expect(workoutLoadPresentation({ session_trimp: 0, load_source: "stream" }).amount).toBe("Load unavailable");
  });

  it("does not invent provenance for legacy recordings", () => {
    const result = workoutLoadPresentation({ session_trimp: 35 });
    expect(result.label).toBe("Source unverified");
    expect(result.measured).toBe(false);
  });
});
