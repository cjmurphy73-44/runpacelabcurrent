// FIN-001 planning-only unit economics. No customer, Stripe or bank data.
// Inputs are hypothetical scenarios, not observed TrainPaceLab metrics.
export function forecastMonth({ openingCustomers, newCustomers, monthlyChurnRate, priceAud, variableCostAud, fixedCostAud, acquisitionSpendAud = 0, openingCashAud = 0 }) {
  const values = [openingCustomers, newCustomers, monthlyChurnRate, priceAud, variableCostAud, fixedCostAud, acquisitionSpendAud, openingCashAud];
  if (values.some(v => !Number.isFinite(v)) || values.slice(0, 7).some(v => v < 0) || monthlyChurnRate > 1) throw new RangeError('Invalid scenario input');
  // Paying customer counts are discrete inputs. Fractional expected churn is
  // permitted as a scenario projection, but fractional starting/new customers
  // would imply a fabricated observed cohort.
  if (!Number.isSafeInteger(openingCustomers) || !Number.isSafeInteger(newCustomers)) {
    throw new RangeError('Customer counts must be non-negative safe integers');
  }
  const churned = openingCustomers * monthlyChurnRate;
  const closingCustomers = openingCustomers - churned + newCustomers;
  const averageCustomers = (openingCustomers + closingCustomers) / 2;
  const revenueAud = averageCustomers * priceAud;
  const contributionAud = revenueAud - averageCustomers * variableCostAud;
  const netCashFlowAud = contributionAud - fixedCostAud - acquisitionSpendAud;
  const closingCashAud = openingCashAud + netCashFlowAud;
  const assumedCacAud = newCustomers > 0 ? acquisitionSpendAud / newCustomers : null;
  const steadyStateLtvAud = monthlyChurnRate > 0 ? (priceAud - variableCostAud) / monthlyChurnRate : null;
  const outputs = [churned, closingCustomers, averageCustomers, revenueAud, contributionAud,
    netCashFlowAud, closingCashAud, assumedCacAud, steadyStateLtvAud];
  // Finite inputs can still overflow when multiplied or divided. Never
  // present Infinity/NaN as a meaningful financial projection.
  if (outputs.some(v => v !== null && !Number.isFinite(v))) {
    throw new RangeError('Scenario output exceeds numeric range');
  }
  return { churned, closingCustomers, averageCustomers, revenueAud, contributionAud,
    netCashFlowAud, closingCashAud, assumedCacAud, steadyStateLtvAud };
}
