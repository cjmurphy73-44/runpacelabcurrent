import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastMonth } from './financialScenario.mjs';
const input = { openingCustomers: 100, newCustomers: 20, monthlyChurnRate: 0.05, priceAud: 19, variableCostAud: 4, fixedCostAud: 1000, acquisitionSpendAud: 200, openingCashAud: 5000 };
test('reconciles monthly customer, revenue and cash balances', () => {
  const result = forecastMonth(input);
  assert.equal(result.churned, 5);
  assert.equal(result.closingCustomers, 115);
  assert.equal(result.averageCustomers, 107.5);
  assert.equal(result.revenueAud, 2042.5);
  assert.equal(result.contributionAud, 1612.5);
  assert.equal(result.netCashFlowAud, 412.5);
  assert.equal(result.closingCashAud, 5412.5);
  assert.equal(result.assumedCacAud, 10);
  assert.equal(result.steadyStateLtvAud, 300);
});
test('zero new customers and zero churn yield null rather than fabricated CAC/LTV', () => {
  const result = forecastMonth({ ...input, newCustomers: 0, monthlyChurnRate: 0 });
  assert.equal(result.assumedCacAud, null);
  assert.equal(result.steadyStateLtvAud, null);
});
test('rejects negative, nonfinite and impossible churn inputs', () => {
  for (const patch of [{ monthlyChurnRate: 1.1 }, { priceAud: -1 }, { newCustomers: Infinity }, { fixedCostAud: NaN }]) {
    assert.throws(() => forecastMonth({ ...input, ...patch }), RangeError);
  }
});
