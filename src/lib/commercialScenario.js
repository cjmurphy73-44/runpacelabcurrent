// Internal scenario modelling only. No real customers, payments or financial records.
// Monetary inputs are AUD per month; CAC is AUD per acquired paying customer.
export function projectSubscriptionUnitEconomics({
  payingCustomers, monthlyPriceAud, variableCostAud, monthlyChurnRate,
  acquisitionCostAud, fixedMonthlyCostAud,
}) {
  const inputs = { payingCustomers, monthlyPriceAud, variableCostAud, monthlyChurnRate, acquisitionCostAud, fixedMonthlyCostAud };
  for (const [name, value] of Object.entries(inputs)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a finite nonnegative number`);
    }
  }
  if (!Number.isSafeInteger(payingCustomers)) throw new RangeError('payingCustomers must be a whole number');
  if (monthlyChurnRate > 1) throw new RangeError('monthlyChurnRate cannot exceed 1');
  if (variableCostAud > monthlyPriceAud) throw new RangeError('variable cost exceeds price; contribution margin is negative');
  const contributionPerCustomerAud = monthlyPriceAud - variableCostAud;
  const monthlyRevenueAud = payingCustomers * monthlyPriceAud;
  const monthlyContributionAud = payingCustomers * contributionPerCustomerAud;
  const monthlyOperatingResultAud = monthlyContributionAud - fixedMonthlyCostAud;
  const breakEvenCustomers = contributionPerCustomerAud > 0
    ? Math.ceil(fixedMonthlyCostAud / contributionPerCustomerAud) : null;
  // Simple stationary churn model, not a forecast of actual retention.
  const illustrativeLtvAud = monthlyChurnRate > 0
    ? contributionPerCustomerAud / monthlyChurnRate : null;
  const illustrativeLtvToCac = acquisitionCostAud > 0 && illustrativeLtvAud !== null
    ? illustrativeLtvAud / acquisitionCostAud : null;
  return {
    monthlyRevenueAud, contributionPerCustomerAud, monthlyContributionAud,
    monthlyOperatingResultAud, breakEvenCustomers, illustrativeLtvAud,
    illustrativeLtvToCac,
  };
}
