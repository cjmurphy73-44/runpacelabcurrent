import { test, expect } from 'vitest';
import { forecastMonth } from './financialScenario.mjs';
const input = { openingCustomers: 100, newCustomers: 20, monthlyChurnRate: 0.05, priceAud: 19, variableCostAud: 4, fixedCostAud: 1000, acquisitionSpendAud: 200, openingCashAud: 5000 };
test('reconciles monthly customer, revenue and cash balances', () => {
  const result = forecastMonth(input);
  expect(result.churned).toBe(5);
  expect(result.closingCustomers).toBe(115);
  expect(result.averageCustomers).toBe(107.5);
  expect(result.revenueAud).toBe(2042.5);
  expect(result.contributionAud).toBe(1612.5);
  expect(result.netCashFlowAud).toBe(412.5);
  expect(result.closingCashAud).toBe(5412.5);
  expect(result.assumedCacAud).toBe(10);
  expect(result.steadyStateLtvAud).toBe(300);
});
test('zero new customers and zero churn yield null rather than fabricated CAC/LTV', () => {
  const result = forecastMonth({ ...input, newCustomers: 0, monthlyChurnRate: 0 });
  expect(result.assumedCacAud).toBe(null);
  expect(result.steadyStateLtvAud).toBe(null);
});
test('rejects negative, nonfinite and impossible churn inputs', () => {
  for (const patch of [{ monthlyChurnRate: 1.1 }, { priceAud: -1 }, { newCustomers: Infinity }, { fixedCostAud: NaN }]) {
    expect(() => forecastMonth({ ...input, ...patch })).toThrow(RangeError);
  }
});
