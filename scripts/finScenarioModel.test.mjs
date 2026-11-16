import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forecastMonth, forecastMonths } from './finScenarioModel.mjs';

const zero = { startingPaid: 0, newPaid: 0, monthlyChurnRate: 0, priceAud: 0, variableCostAud: 0, fixedCostAud: 0, startingCashAud: 0 };
test('zero-input case does not fabricate sales or cash', () => {
  assert.deepEqual(forecastMonth(zero), { paidEnd:0, averagePaid:0, revenueAud:0, variableCostsAud:0, contributionAud:0, netCashFlowAud:0, endingCashAud:0 });
});
test('deterministic churn and monthly cash arithmetic', () => {
  const x = forecastMonth({ startingPaid:100, newPaid:20, monthlyChurnRate:0.1, priceAud:10, variableCostAud:2, fixedCostAud:500, startingCashAud:1000 });
  assert.equal(x.paidEnd,110);
  assert.equal(x.averagePaid,105);
  assert.equal(x.revenueAud,1050);
  assert.equal(x.contributionAud,840);
  assert.equal(x.endingCashAud,1340);
});
test('cash rolls forward, with no invented new customer changes', () => {
  const rows = forecastMonths({ ...zero, startingCashAud:100, fixedCostAud:25 }, 2);
  assert.equal(rows[0].endingCashAud,75);
  assert.equal(rows[1].endingCashAud,50);
});
test('rejects missing, negative, nonfinite, and invalid churn assumptions', () => {
  for (const bad of [{...zero, priceAud:-1},{...zero, priceAud:Infinity},{...zero, monthlyChurnRate:1.1},{...zero, startingPaid:undefined}]) assert.throws(()=>forecastMonth(bad), RangeError);
  assert.throws(()=>forecastMonths(zero,121),RangeError);
});
