// Scenario-only SaaS unit economics. All inputs are user-supplied assumptions.
// No actual traction, revenue, Stripe data or forecasts are inferred.
export function calculateSubscriptionScenario(input) {
  const fail = reason => ({ ok: false, reason });
  if (!input || typeof input !== "object") return fail("Missing scenario");
  const required = ["monthlyPrice", "activeSubscribers", "monthlyChurnRate", "monthlyVariableCostPerSubscriber", "monthlyFixedCost", "customerAcquisitionCost"];
  if (required.some(k => typeof input[k] !== "number" || !Number.isFinite(input[k]) || input[k] < 0)) {
    return fail("Scenario inputs must be finite nonnegative numbers");
  }
  if (!Number.isSafeInteger(input.activeSubscribers)) return fail("Subscribers must be a whole number");
  if (input.monthlyChurnRate > 1) return fail("Monthly churn must be between zero and one");
  if (input.monthlyPrice === 0 && input.activeSubscribers > 0) return fail("Paid subscriber scenario requires positive price");
  const revenue = input.monthlyPrice * input.activeSubscribers;
  const variableCost = input.monthlyVariableCostPerSubscriber * input.activeSubscribers;
  const contributionPerSubscriber = input.monthlyPrice - input.monthlyVariableCostPerSubscriber;
  const contribution = revenue - variableCost;
  const operatingResult = contribution - input.monthlyFixedCost;
  const ltv = input.monthlyChurnRate > 0 && contributionPerSubscriber > 0
    ? contributionPerSubscriber / input.monthlyChurnRate : null;
  const paybackMonths = contributionPerSubscriber > 0
    ? input.customerAcquisitionCost / contributionPerSubscriber : null;
  const breakEvenSubscribers = contributionPerSubscriber > 0
    ? Math.ceil(input.monthlyFixedCost / contributionPerSubscriber) : null;
  const numbers = [revenue, variableCost, contribution, operatingResult, ltv, paybackMonths, breakEvenSubscribers].filter(v => v !== null);
  if (numbers.some(v => !Number.isFinite(v) || !Number.isSafeInteger(Math.ceil(Math.abs(v))))) return fail("Scenario exceeds safe numeric range");
  return {
    ok: true,
    kind: "assumption_only_not_actual_financials",
    currency: input.currency || "AUD",
    monthlyRevenue: revenue,
    monthlyVariableCost: variableCost,
    monthlyContribution: contribution,
    monthlyOperatingResultBeforeTax: operatingResult,
    contributionPerSubscriber,
    simplisticLtv: ltv,
    simplisticCacPaybackMonths: paybackMonths,
    breakEvenSubscribers,
    caveat: "Excludes tax, payment fees unless included in variable cost, refunds, churn cohorts, retention variation, growth, capital costs and founder salary unless entered as fixed cost.",
  };
}
