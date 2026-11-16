// FIN-001 planning-only unit economics. No customer, Stripe or bank data.
// Inputs are hypothetical scenarios, not observed TrainPaceLab metrics.
export function forecastMonth({ openingCustomers, newCustomers, monthlyChurnRate, priceAud, variableCostAud, fixedCostAud, acquisitionSpendAud = 0, openingCashAud = 0 }) {
  const values = [openingCustomers, newCustomers, monthlyChurnRate, priceAud, variableCostAud, fixedCostAud, acquisitionSpendAud, openingCashAud];
  if (values.some(v => !Number.isFinite(v)) || values.slice(0, 7).some(v => v < 0) || monthlyChurnRate > 1) throw new RangeError('Invalid scenario input');
  const churned = openingCustomers * monthlyChurnRate;
  const closingCustomers = openingCustomers - churned + newCustomers;
  const averageCustomers = (openingCustomers + closingCustomers) / 2;
  const revenueAud = averageCustomers * priceAud;
  const contributionAud = revenueAud - averageCustomers * variableCostAud;
  const netCashFlowAud = contributionAud - fixedCostAud - acquisitionSpendAud;
  return { churned, closingCustomers, averageCustomers, revenueAud, contributionAud, netCashFlowAud, closingCashAud: openingCashAud + netCashFlowAud,
    assumedCacAud: newCustomers > 0 ? acquisitionSpendAud / newCustomers : null,
    steadyStateLtvAud: monthlyChurnRate > 0 ? (priceAud - variableCostAud) / monthlyChurnRate : null };
}
