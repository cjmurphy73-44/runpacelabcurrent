// Synthetic commercial scenario model. Inputs are assumptions, not observed traction.
// All monetary inputs are AUD; no Stripe, customer, or production data is accessed.
const finiteNonnegative = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0;
export function calculateUnitEconomics(input) {
  const { monthlyPriceAud, monthlyVariableCostAud, monthlyChurnRate, acquisitionCostAud, monthlyFixedCostAud, startingCashAud } = input ?? {};
  if (![monthlyPriceAud, monthlyVariableCostAud, monthlyChurnRate, acquisitionCostAud, monthlyFixedCostAud, startingCashAud].every(finiteNonnegative)
      || monthlyPriceAud === 0 || monthlyChurnRate > 1) {
    return { valid: false, reason: "Enter finite nonnegative assumptions, positive price and churn between 0 and 1." };
  }
  const contributionAud = monthlyPriceAud - monthlyVariableCostAud;
  if (contributionAud <= 0) return { valid: false, reason: "Nonpositive contribution margin; LTV and payback are not meaningful." };
  const ltvAud = monthlyChurnRate > 0 ? contributionAud / monthlyChurnRate : null;
  const paybackMonths = acquisitionCostAud / contributionAud;
  const breakevenSubscribers = Math.ceil(monthlyFixedCostAud / contributionAud);
  const runwayMonthsNoRevenue = monthlyFixedCostAud > 0 ? startingCashAud / monthlyFixedCostAud : null;
  return {
    valid: true,
    contributionAud,
    marginRate: contributionAud / monthlyPriceAud,
    ltvAud, // null when churn=0; never claim infinite observed LTV
    ltvToCac: ltvAud !== null && acquisitionCostAud > 0 ? ltvAud / acquisitionCostAud : null,
    paybackMonths,
    breakevenSubscribers,
    runwayMonthsNoRevenue, // deliberately ignores revenue, tax and working capital
    kind: "assumption-only",
  };
}
