import { describe, it, expect } from 'vitest';
import { projectSubscriptionUnitEconomics as project } from '../commercialScenario.js';

const assumptions = {
  payingCustomers: 100, monthlyPriceAud: 19, variableCostAud: 4,
  monthlyChurnRate: 0.05, acquisitionCostAud: 60, fixedMonthlyCostAud: 1200,
};
describe('commercial scenario maths (hypothetical AUD, never traction)', () => {
  it('calculates contribution, break-even, and churn-based LTV consistently', () => {
    expect(project(assumptions)).toEqual({
      monthlyRevenueAud: 1900, contributionPerCustomerAud: 15,
      monthlyContributionAud: 1500, monthlyOperatingResultAud: 300,
      breakEvenCustomers: 80, illustrativeLtvAud: 300, illustrativeLtvToCac: 5,
    });
  });
  it('reports unknown LTV when churn is zero rather than infinity', () => {
    const r = project({ ...assumptions, monthlyChurnRate: 0 });
    expect(r.illustrativeLtvAud).toBeNull();
    expect(r.illustrativeLtvToCac).toBeNull();
  });
  it('reports unknown break-even when contribution is zero', () => {
    expect(project({ ...assumptions, variableCostAud: 19 }).breakEvenCustomers).toBeNull();
  });
  it('rejects invalid assumptions instead of manufacturing results', () => {
    for (const v of [NaN, Infinity, -1, '100']) {
      expect(() => project({ ...assumptions, payingCustomers: v })).toThrow();
    }
    expect(() => project({ ...assumptions, payingCustomers: 1.5 })).toThrow();
    expect(() => project({ ...assumptions, monthlyChurnRate: 1.1 })).toThrow();
    expect(() => project({ ...assumptions, variableCostAud: 20 })).toThrow();
  });
  it('does not divide by zero acquisition cost', () => {
    expect(project({ ...assumptions, acquisitionCostAud: 0 }).illustrativeLtvToCac).toBeNull();
  });
});
