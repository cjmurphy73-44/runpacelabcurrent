import { describe, expect, it } from "vitest";
import { computeHolisticReadiness } from "@/science/readiness";
import { readinessFallbackInputs } from "../readinessFallbackInputs";

describe("readiness fallback contract", () => {
  it("uses real stored measurements and supplies TSB separately", () => {
    const inputs = readinessFallbackInputs(
      { hrv: 65, sleep_score: 82, resting_hr: 51, calculated_tsb: -12 },
      [{ hrv_ms: 60, resting_hr: 54 }, { hrv_ms: 62, resting_hr: 56 }]
    );
    expect(inputs.current).toMatchObject({ hrvMs: 65, sleepScore: 82, restingHr: 51 });
    expect(inputs.current.tsb).toBeUndefined();
    expect(inputs.baseline).toMatchObject({ hrvMean: 61, restingHrMean: 55 });
    expect(inputs.tsb).toBe(-12);
    const result = computeHolisticReadiness(inputs.current, inputs.baseline, inputs.tsb);
    expect(result.validSignalCount).toBe(4);
    expect(result.details.tsb).toBe(-12);
  });

  it("rejects malformed provider data rather than fabricating readiness", () => {
    const inputs = readinessFallbackInputs(
      { hrv: "75", sleep_score: Infinity, resting_hr: NaN, calculated_tsb: "10" },
      [{ resting_hr: "52", hrv_ms: Infinity }]
    );
    expect(inputs.current).toMatchObject({ hrvMs: null, sleepScore: null, restingHr: null });
    expect(inputs.baseline).toMatchObject({ hrvMean: null, restingHrMean: null });
    expect(inputs.tsb).toBeNull();
    expect(computeHolisticReadiness(inputs.current, inputs.baseline, inputs.tsb).score).toBeNull();
  });

  it("does not derive a score without a daily measurement", () => {
    expect(readinessFallbackInputs(null, [])).toBeNull();
  });
});
