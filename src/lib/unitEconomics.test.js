import { describe, expect, it } from 'vitest';
import { evaluateUnitEconomics } from './unitEconomics.js';
const assumptions = { monthlyPriceAud: 19, paymentFeeRate: 0.02, paymentFeeFixedAud: 0.3, variableCostAud: 3, monthlyChurnRate: 0.05, acquisitionCostAud: 30 };
describe('commercial scenario calculator (assumptions, not actuals)', () => {
  it('calculates contribution, lifetime and payback deterministically', () => {
    const r = evaluateUnitEconomics(assumptions);
    expect(r.feeAud).toBeCloseTo(0.68);
    expect(r.contributionAud).toBeCloseTo(15.32);
    expect(r.lifetimeMonths).toBeCloseTo(20);
    expect(r.lifetimeContributionAud).toBeCloseTo(306.4);
    expect(r.paybackMonths).toBeCloseTo(30 / 15.32);
    expect(r.source).toBe('assumption-only');
  });
  it('does not invent finite LTV for zero churn', () => {
    const r = evaluateUnitEconomics({ ...assumptions, monthlyChurnRate: 0 });
    expect(r.lifetimeMonths).toBeNull();
    expect(r.lifetimeContributionAud).toBeNull();
    expect(r.ltvToCac).toBeNull();
  });
  it('does not invent payback for loss-making customers', () => {
    const r = evaluateUnitEconomics({ ...assumptions, variableCostAud: 20 });
    expect(r.paybackMonths).toBeNull();
    expect(r.lifetimeContributionAud).toBeNull();
  });
  it.each([{ monthlyPriceAud: -1 }, { monthlyChurnRate: 1.01 }, { paymentFeeRate: 1 }, { acquisitionCostAud: NaN }, { variableCostAud: Infinity }, { paymentFeeFixedAud: -0.01 }])('rejects invalid assumptions %j', (patch) => {
    expect(() => evaluateUnitEconomics({ ...assumptions, ...patch })).toThrow(RangeError);
  });
  it('fails closed when individually finite assumptions overflow derived metrics', () => {
    expect(() => evaluateUnitEconomics({ ...assumptions, monthlyPriceAud: 1e308, paymentFeeRate: 0.99, paymentFeeFixedAud: 1e308 })).toThrow(/Non-finite derived scenario result/);
    expect(() => evaluateUnitEconomics({ ...assumptions, monthlyChurnRate: Number.MIN_VALUE })).toThrow(/Non-finite derived scenario result/);
    expect(() => evaluateUnitEconomics({ ...assumptions, acquisitionCostAud: 1e308, variableCostAud: 18.999999999 })).toThrow(/Non-finite derived scenario result/);
  });
  it('avoids dividing by zero when acquisition is free', () => {
    expect(evaluateUnitEconomics({ ...assumptions, acquisitionCostAud: 0 }).ltvToCac).toBeNull();
  });
});
