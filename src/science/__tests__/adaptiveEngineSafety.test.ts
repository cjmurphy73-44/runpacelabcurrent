import { describe, expect, it } from 'vitest';
import { calculateAdaptiveRecommendation } from '../adaptiveEngine';

const baseline = { acwr: 1, acute: 50, chronic: 50, rpe: 5 };
describe('adaptive recommendation safety', () => {
  it('does not prescribe a load increase from a low ACWR alone', () => {
    const result = calculateAdaptiveRecommendation({ ...baseline, acwr: 0.65, acute: 32.5 });
    expect(result.adjustmentPercentage).toBe(0);
    expect(result.guidanceText).toMatch(/does not justify increasing/i);
  });
  it('does not claim an injury probability or automatically change a high-load plan', () => {
    const result = calculateAdaptiveRecommendation({ ...baseline, acwr: 1.7, acute: 85 });
    expect(result.status).toBe('danger');
    expect(result.adjustmentPercentage).toBe(0);
    expect(result.guidanceText).not.toMatch(/risk of overtraining|injury risk/i);
  });
  it('rejects invalid or missing inputs rather than producing a false green status', () => {
    expect(calculateAdaptiveRecommendation({ ...baseline, acwr: Number.NaN }).status).toBe('caution');
    expect(calculateAdaptiveRecommendation({ ...baseline, chronic: 0 }).status).toBe('caution');
    expect(calculateAdaptiveRecommendation({ ...baseline, rpe: 11 }).status).toBe('caution');
  });
  it('leaves valid stable input unchanged', () => {
    expect(calculateAdaptiveRecommendation(baseline)).toMatchObject({ status: 'optimal', adjustmentPercentage: 0 });
  });
});
