import { describe, expect, it } from "vitest";
import { cyclingPowerScenario } from "../cyclingPowerScenario";
const flat = { speedKmh: 30, riderMassKg: 75 };
describe("unmeasured cycling power scenario", () => {
  it("returns a finite plausible baseline and zero at invalid input", () => {
    const result = cyclingPowerScenario(flat);
    expect(result.watts).toBeGreaterThan(100);
    expect(result.watts).toBeLessThan(300);
    expect(cyclingPowerScenario({ ...flat, riderMassKg: undefined })).toBeNull();
    expect(cyclingPowerScenario({ ...flat, speedKmh: 0 })).toBeNull();
  });
  it("responds to wind, slope and mass without inventing measured power or FTP", () => {
    const a = cyclingPowerScenario(flat).watts;
    expect(cyclingPowerScenario({ ...flat, headwindKmh: 10 }).watts).toBeGreaterThan(a);
    expect(cyclingPowerScenario({ ...flat, gradePercent: 2 }).watts).toBeGreaterThan(a);
    expect(cyclingPowerScenario({ ...flat, gradePercent: -3 }).watts).toBeLessThan(a);
    expect(cyclingPowerScenario({ ...flat, riderMassKg: 95 }).watts).toBeGreaterThan(a);
    expect(cyclingPowerScenario(flat)).not.toHaveProperty("ftp");
  });
  it("rejects unrealistic parameters and nonfinite observations", () => {
    expect(cyclingPowerScenario({ ...flat, cda: 0 })).toBeNull();
    expect(cyclingPowerScenario({ ...flat, headwindKmh: Infinity })).toBeNull();
    expect(cyclingPowerScenario({ ...flat, gradePercent: 100 })).toBeNull();
  });
});
