// FIN-001: deterministic planning calculator. All values are user-supplied assumptions, never actuals.
export function forecastMonth(input) {
  const keys = ['startingPaid','newPaid','monthlyChurnRate','priceAud','variableCostAud','fixedCostAud','startingCashAud'];
  for (const key of keys) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0) throw new RangeError(key + ' must be a finite nonnegative number');
  }
  if (input.monthlyChurnRate > 1) throw new RangeError('monthlyChurnRate must be <= 1');
  const paidEnd = input.startingPaid * (1 - input.monthlyChurnRate) + input.newPaid;
  const averagePaid = (input.startingPaid + paidEnd) / 2;
  const revenueAud = averagePaid * input.priceAud;
  const variableCostsAud = averagePaid * input.variableCostAud;
  const contributionAud = revenueAud - variableCostsAud;
  const netCashFlowAud = contributionAud - input.fixedCostAud;
  return { paidEnd, averagePaid, revenueAud, variableCostsAud, contributionAud, netCashFlowAud, endingCashAud: input.startingCashAud + netCashFlowAud };
}
export function forecastMonths(start, months) {
  if (!Number.isSafeInteger(months) || months < 1 || months > 120) throw new RangeError('months must be 1..120');
  const results = [];
  let current = { ...start };
  for (let i = 1; i <= months; i++) {
    const result = forecastMonth(current);
    results.push({ month: i, ...result });
    current = { ...current, startingPaid: result.paidEnd, startingCashAud: result.endingCashAud };
  }
  return results;
}
