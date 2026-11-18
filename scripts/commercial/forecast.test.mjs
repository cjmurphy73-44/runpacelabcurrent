import { test, expect } from 'vitest';
import { forecastMonth, forecastHorizon } from './forecast.mjs';
const fixture = { startingCustomers: 100, newCustomers: 10, monthlyChurn: 0.1, monthlyPriceAud: 9, feeRate: 0.02, feeFixedAud: 0.3, variableCostAud: 1, fixedCostAud: 500, startingCashAud: 1000 };
test('known arithmetic, fees, and contribution', () => {
  const r = forecastMonth(fixture);
  expect(r.endingCustomers).toBe(100);
  expect(r.grossRevenueAud).toBe(900);
  expect(r.processingFeesAud).toBe(48);
  expect(r.variableCostsAud).toBe(100);
  expect(r.contributionAud).toBe(752);
  expect(r.netCashFlowAud).toBe(252);
});
test('zero-customer loss and cash depletion', () => {
  const r = forecastHorizon({ ...fixture, startingCustomers: 0, newCustomers: 0, fixedCostAud: 600 }, 2);
  expect(r.firstNegativeCashMonth).toBe(2);
  expect(r.rows[1].endingCashAud).toBe(-200);
});
test('no acquisition and full churn', () => expect(forecastMonth({ ...fixture, newCustomers: 0, monthlyChurn: 1 }).endingCustomers).toBe(0));
test('zero fixed cost and zero fees', () => expect(forecastMonth({ ...fixture, feeRate: 0, feeFixedAud: 0, variableCostAud: 0, fixedCostAud: 0 }).netCashFlowAud).toBe(900));
test('rejects negative price', () => expect(() => forecastMonth({ ...fixture, monthlyPriceAud: -1 })).toThrow(RangeError));
test('rejects churn above one', () => expect(() => forecastMonth({ ...fixture, monthlyChurn: 1.01 })).toThrow(RangeError));
test('rejects NaN or numeric strings', () => {
  expect(() => forecastMonth({ ...fixture, feeRate: NaN })).toThrow(RangeError);
  expect(() => forecastMonth({ ...fixture, newCustomers: '5' })).toThrow(RangeError);
});
test('rejects invalid horizon', () => {
  expect(() => forecastHorizon(fixture, 0)).toThrow(RangeError);
  expect(() => forecastHorizon(fixture, 1.5)).toThrow(RangeError);
});
test('retains input immutability', () => {
  const old = structuredClone(fixture);
  forecastHorizon(fixture, 3);
  expect(fixture).toEqual(old);
});
