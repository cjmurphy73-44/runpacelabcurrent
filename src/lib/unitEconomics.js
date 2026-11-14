/** Scenario-only commercial planning. Inputs are assumptions, never observed traction. */
export function evaluateUnitEconomics({ monthlyPriceAud, paymentFeeRate, paymentFeeFixedAud, variableCostAud, monthlyChurnRate, acquisitionCostAud }) {
  const inputs = { monthlyPriceAud, paymentFeeRate, paymentFeeFixedAud, variableCostAud, monthlyChurnRate, acquisitionCostAud };
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new RangeError(`Invalid assumption: ${key}`);
  }
  if (monthlyPriceAud <= 0 || paymentFeeRate >= 1 || monthlyChurnRate > 1) throw new RangeError('Invalid pricing, fee or churn assumption');
  const feeAud = monthlyPriceAud * paymentFeeRate + paymentFeeFixedAud;
  const contributionAud = monthlyPriceAud - feeAud - variableCostAud;
  const contributionMargin = contributionAud / monthlyPriceAud;
  const lifetimeMonths = monthlyChurnRate === 0 ? null : 1 / monthlyChurnRate;
  const lifetimeContributionAud = lifetimeMonths === null || contributionAud <= 0 ? null : contributionAud * lifetimeMonths;
  const paybackMonths = contributionAud <= 0 ? null : acquisitionCostAud / contributionAud;
  const ltvToCac = acquisitionCostAud === 0 || lifetimeContributionAud === null ? null : lifetimeContributionAud / acquisitionCostAud;
  for (const [key, value] of Object.entries({ feeAud, contributionAud, contributionMargin, lifetimeMonths, lifetimeContributionAud, paybackMonths, ltvToCac })) {
    if (value !== null && !Number.isFinite(value)) throw new RangeError(`Non-finite derived scenario result: ${key}`);
  }
  return { feeAud, contributionAud, contributionMargin, lifetimeMonths, lifetimeContributionAud, paybackMonths, ltvToCac, source: 'assumption-only' };
}
