import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastMonth, forecastHorizon } from './forecast.mjs';
const fixture = { startingCustomers: 100, newCustomers: 10, monthlyChurn: 0.1, monthlyPriceAud: 9, feeRate: 0.02, feeFixedAud: 0.3, variableCostAud: 1, fixedCostAud: 500, startingCashAud: 1000 };
test('known arithmetic, fees, and contribution', () => {
  const r = forecastMonth(fixture);
  assert.equal(r.endingCustomers, 100);
  assert.equal(r.grossRevenueAud, 900);
  assert.equal(r.processingFeesAud, 48);
  assert.equal(r.variableCostsAud, 100);
  assert.equal(r.contributionAud, 752);
  assert.equal(r.netCashFlowAud, 252);
});
test('zero-customer loss and cash depletion', () => {
  const r = forecastHorizon({ ...fixture, startingCustomers: 0, newCustomers: 0, fixedCostAud: 600 }, 2);
  assert.equal(r.firstNegativeCashMonth, 2);
  assert.equal(r.rows[1].endingCashAud, -200);
});
test('no acquisition and full churn', () => assert.equal(forecastMonth({ ...fixture, newCustomers: 0, monthlyChurn: 1 }).endingCustomers, 0));
test('zero fixed cost and zero fees', () => assert.equal(forecastMonth({ ...fixture, feeRate: 0, feeFixedAud: 0, variableCostAud: 0, fixedCostAud: 0 }).netCashFlowAud, 900));
test('rejects negative price', () => assert.throws(() => forecastMonth({ ...fixture, monthlyPriceAud: -1 }), RangeError));
test('rejects churn above one', () => assert.throws(() => forecastMonth({ ...fixture, monthlyChurn: 1.01 }), RangeError));
test('rejects NaN or numeric strings', () => {
  assert.throws(() => forecastMonth({ ...fixture, feeRate: NaN }), RangeError);
  assert.throws(() => forecastMonth({ ...fixture, newCustomers: '5' }), RangeError);
});
test('rejects invalid horizon', () => {
  assert.throws(() => forecastHorizon(fixture, 0), RangeError);
  assert.throws(() => forecastHorizon(fixture, 1.5), RangeError);
});
test('retains input immutability', () => {
  const old = structuredClone(fixture);
  forecastHorizon(fixture, 3);
  assert.deepEqual(fixture, old);
});
