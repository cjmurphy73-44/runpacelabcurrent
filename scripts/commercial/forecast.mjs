/** Draft-only FIN-001 scenario arithmetic. AUD; no real financial or customer data. */
const valid = (name, x, min = 0, max = Infinity) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max) throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  return x;
};
export function forecastMonth({ startingCustomers, newCustomers, monthlyChurn, monthlyPriceAud, feeRate, feeFixedAud, variableCostAud, fixedCostAud }) {
  const start = valid('startingCustomers', startingCustomers);
  const newPaid = valid('newCustomers', newCustomers);
  const churn = valid('monthlyChurn', monthlyChurn, 0, 1);
  const price = valid('monthlyPriceAud', monthlyPriceAud);
  const rate = valid('feeRate', feeRate, 0, 1);
  const fee = valid('feeFixedAud', feeFixedAud);
  const variable = valid('variableCostAud', variableCostAud);
  const fixed = valid('fixedCostAud', fixedCostAud);
  const retained = start * (1 - churn);
  const endingCustomers = retained + newPaid;
  // Modeling convention: new customers are billed for the full month; fractional cohorts are expectations.
  const grossRevenueAud = endingCustomers * price;
  const processingFeesAud = endingCustomers * (price * rate + fee);
  const variableCostsAud = endingCustomers * variable;
  const contributionAud = grossRevenueAud - processingFeesAud - variableCostsAud;
  const netCashFlowAud = contributionAud - fixed;
  return { retained, endingCustomers, grossRevenueAud, processingFeesAud, variableCostsAud, contributionAud, netCashFlowAud };
}
export function forecastHorizon(inputs, months) {
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new RangeError('months must be 1..120');
  valid('startingCashAud', inputs.startingCashAud);
  let customers = valid('startingCustomers', inputs.startingCustomers);
  let balance = inputs.startingCashAud;
  const rows = [];
  for (let month = 1; month <= months; month++) {
    const result = forecastMonth({ ...inputs, startingCustomers: customers });
    balance += result.netCashFlowAud;
    rows.push({ month, ...result, endingCashAud: balance });
    customers = result.endingCustomers;
  }
  return { rows, firstNegativeCashMonth: rows.find(r => r.endingCashAud < 0)?.month ?? null };
}
