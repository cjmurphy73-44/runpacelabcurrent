import { describe, expect, it } from "vitest";
import { calculateSubscriptionScenario } from "../subscriptionScenario";

const assumed = { monthlyPrice: 19, activeSubscribers: 100, monthlyChurnRate: 0.05, monthlyVariableCostPerSubscriber: 4, monthlyFixedCost: 600, customerAcquisitionCost: 45, currency: "AUD" };
describe("assumption-only subscription scenario", () => {
  it("computes contribution, payback, simple LTV and break-even from synthetic inputs", () => {
    expect(calculateSubscriptionScenario(assumed)).toMatchObject({
      ok: true, kind: "assumption_only_not_actual_financials",
      monthlyRevenue: 1900, monthlyVariableCost: 400,
      monthlyContribution: 1500, monthlyOperatingResultBeforeTax: 900,
      contributionPerSubscriber: 15, simplisticLtv: 300,
      simplisticCacPaybackMonths: 3, breakEvenSubscribers: 40,
    });
  });
  it("does not invent LTV for zero churn or nonpositive margin", () => {
    expect(calculateSubscriptionScenario({ ...assumed, monthlyChurnRate: 0 }).simplisticLtv).toBeNull();
    expect(calculateSubscriptionScenario({ ...assumed, monthlyVariableCostPerSubscriber: 22 })).toMatchObject({
      simplisticLtv: null, simplisticCacPaybackMonths: null, breakEvenSubscribers: null,
    });
  });
  it("rejects missing, negative, nonfinite and fractional subscribers", () => {
    for (const patch of [
      { monthlyPrice: NaN }, { monthlyPrice: -1 }, { activeSubscribers: 1.5 },
      { customerAcquisitionCost: Infinity }, { monthlyChurnRate: 1.1 },
    ]) expect(calculateSubscriptionScenario({ ...assumed, ...patch }).ok).toBe(false);
    expect(calculateSubscriptionScenario({}).ok).toBe(false);
  });
  it("labels results as assumptions, not actual financials", () => {
    const result = calculateSubscriptionScenario(assumed);
    expect(result.kind).toBe("assumption_only_not_actual_financials");
    expect(result.caveat).toContain("payment fees");
  });
});
