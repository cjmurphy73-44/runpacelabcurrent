import { describe, expect, it } from "vitest";
import { calculateUnitEconomics } from "../commercialUnitEconomics";
const synthetic = { monthlyPriceAud: 20, monthlyVariableCostAud: 5, monthlyChurnRate: 0.05, acquisitionCostAud: 60, monthlyFixedCostAud: 150, startingCashAud: 900 };
describe("assumption-only commercial unit economics", () => {
  it("calculates contribution, payback, break-even and no-revenue runway", () => {
    expect(calculateUnitEconomics(synthetic)).toEqual({
      valid: true, contributionAud: 15, marginRate: 0.75, ltvAud: 300,
      ltvToCac: 5, paybackMonths: 4, breakevenSubscribers: 10,
      runwayMonthsNoRevenue: 6, kind: "assumption-only",
    });
  });
  it("does not invent an LTV when churn is assumed zero", () => {
    expect(calculateUnitEconomics({ ...synthetic, monthlyChurnRate: 0 }).ltvAud).toBeNull();
  });
  it("does not invent runway without fixed costs", () => {
    expect(calculateUnitEconomics({ ...synthetic, monthlyFixedCostAud: 0 }).runwayMonthsNoRevenue).toBeNull();
  });
  it("rejects negative margin and invalid assumptions", () => {
    for (const change of [{ monthlyPriceAud: 0 }, { monthlyVariableCostAud: 21 }, { monthlyChurnRate: 1.1 }, { acquisitionCostAud: NaN }, { startingCashAud: -1 }]) {
      expect(calculateUnitEconomics({ ...synthetic, ...change }).valid).toBe(false);
    }
  });
  it("does not divide by zero CAC", () => {
    expect(calculateUnitEconomics({ ...synthetic, acquisitionCostAud: 0 }).ltvToCac).toBeNull();
  });
});
