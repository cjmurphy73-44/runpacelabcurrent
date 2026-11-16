import { test, expect } from 'vitest';
import { forecastMonth, forecastMonths } from './finScenarioModel.mjs';

const zero = { startingPaid: 0, newPaid: 0, monthlyChurnRate: 0, priceAud: 0, variableCostAud: 0, fixedCostAud: 0, startingCashAud: 0 };
test('zero-input case does not fabricate sales or cash', () => {
  expect(forecastMonth(zero)).toEqual({ paidEnd:0, averagePaid:0, revenueAud:0, variableCostsAud:0, contributionAud:0, netCashFlowAud:0, endingCashAud:0 });
});
test('deterministic churn and monthly cash arithmetic', () => {
  const x = forecastMonth({ startingPaid:100, newPaid:20, monthlyChurnRate:0.1, priceAud:10, variableCostAud:2, fixedCostAud:500, startingCashAud:1000 });
  expect(x.paidEnd).toBe(110);
  expect(x.averagePaid).toBe(105);
  expect(x.revenueAud).toBe(1050);
  expect(x.contributionAud).toBe(840);
  expect(x.endingCashAud).toBe(1340);
});
test('cash rolls forward, with no invented new customer changes', () => {
  const rows = forecastMonths({ ...zero, startingCashAud:100, fixedCostAud:25 }, 2);
  expect(rows[0].endingCashAud).toBe(75);
  expect(rows[1].endingCashAud).toBe(50);
});
test('rejects missing, negative, nonfinite, and invalid churn assumptions', () => {
  for (const bad of [{...zero, priceAud:-1},{...zero, priceAud:Infinity},{...zero, monthlyChurnRate:1.1},{...zero, startingPaid:undefined}]) expect(()=>forecastMonth(bad)).toThrow(RangeError);
  expect(()=>forecastMonths(zero,121)).toThrow(RangeError);
});
