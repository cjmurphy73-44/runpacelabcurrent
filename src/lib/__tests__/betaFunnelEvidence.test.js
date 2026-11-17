import { describe, expect, it } from 'vitest';
import { BETA_FUNNEL_STAGES, evaluateBetaFunnel } from '../betaFunnelEvidence.js';

const cohort = {
  landing: 100, signup: 40, connected: 30, trusted_workout: 20,
  returning_week_one: 12, paid_after_week_one: 5,
};

describe('privacy-gated beta funnel', () => {
  it('never presents assumed counts as measured conversion', () => {
    const result = evaluateBetaFunnel(cohort);
    expect(result.evidence_status).toBe('assumptions_only');
    expect(result.cohort_size).toBeNull();
    expect(Object.values(result.rates).every((rate) => rate === null)).toBe(true);
  });
  it('computes only verified, sufficiently sized transitions', () => {
    const result = evaluateBetaFunnel(cohort, { evidenceVerified: true });
    expect(result.rates.signup).toBe(0.4);
    expect(result.rates.trusted_workout).toBeCloseTo(2 / 3);
    expect(result.rates.paid_after_week_one).toBe(5 / 12);
    expect(result.cohort_size).toBe(100);
  });
  it('suppresses small denominator and zero denominator instead of inventing zero', () => {
    const result = evaluateBetaFunnel({
      ...cohort, returning_week_one: 9, paid_after_week_one: 0,
    }, { evidenceVerified: true });
    expect(result.rates.paid_after_week_one).toBeNull();
    expect(evaluateBetaFunnel(Object.fromEntries(BETA_FUNNEL_STAGES.map((k) => [k, 0])), { evidenceVerified: true }).rates.signup).toBeNull();
  });
  it('rejects impossible nested cohorts and fractional or invalid counts', () => {
    expect(() => evaluateBetaFunnel({ ...cohort, connected: 41 }, { evidenceVerified: true })).toThrow();
    expect(() => evaluateBetaFunnel({ ...cohort, signup: 1.2 })).toThrow();
    expect(() => evaluateBetaFunnel({ ...cohort, landing: -1 })).toThrow();
    expect(() => evaluateBetaFunnel({ ...cohort, landing: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    expect(() => evaluateBetaFunnel({ ...cohort, paid_after_week_one: undefined })).toThrow();
  });
  it('cannot lower privacy suppression below ten', () => {
    expect(() => evaluateBetaFunnel(cohort, { evidenceVerified: true, minimumCohort: 1 })).toThrow();
    const small = evaluateBetaFunnel(Object.fromEntries(BETA_FUNNEL_STAGES.map((k) => [k, 5])), { evidenceVerified: true });
    expect(small.suppressed).toBe(true);
    expect(Object.values(small.rates).every((rate) => rate === null)).toBe(true);
  });
});
