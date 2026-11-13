import { describe, expect, it } from "vitest";
import { efficiencyFactorInterpretation, aerobicDecouplingInterpretation } from "../workoutInterpretation";

describe("cautious workout interpretation", () => {
  it("describes cycling efficiency without claiming a fitness adaptation", () => {
    const result = efficiencyFactorInterpretation(1.42, "cycling");
    expect(result).toContain("power output");
    expect(result).toContain("1.42");
    expect(result).toContain("do not establish a fitness gain");
  });
  it("does not mislabel running efficiency as measured cycling watts", () => {
    const result = efficiencyFactorInterpretation(1.23, "running");
    expect(result).toContain("pace-derived output");
    expect(result).not.toContain("power output");
  });
  it("does not present invalid or unavailable values as physiological evidence", () => {
    for (const value of [null, "", undefined, 0, -1, "not-a-number", Number.NaN]) {
      expect(efficiencyFactorInterpretation(value, "running")).toBeNull();
      expect(aerobicDecouplingInterpretation(value)).toBeNull();
    }
  });
  it("flags substantial decoupling without diagnosing its cause", () => {
    const result = aerobicDecouplingInterpretation(6.28);
    expect(result).toContain("6.3%");
    expect(result).toContain("cannot identify the cause");
    expect(result).toContain("measurement quality");
    expect(aerobicDecouplingInterpretation(-5.6)).toContain("-5.6%");
  });
  it("keeps small decoupling observations out of the headline takeaways", () => {
    expect(aerobicDecouplingInterpretation(4.99)).toBeNull();
    expect(aerobicDecouplingInterpretation(-4.99)).toBeNull();
  });
});
