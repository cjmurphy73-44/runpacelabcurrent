import { describe, expect, it } from 'vitest';
import { calculateAdaptiveRecommendation } from '../adaptiveEngine';

describe('legacy adaptive recommendation scientific safety', () => {
  it.each([0.5, 1, 1.3, 2])('does not prescribe a load change from ACWR %s alone', (acwr) => {
    const result = calculateAdaptiveRecommendation({ acwr, chronic: 40, acute: 50, rpe: 6 });
    expect(result.adjustmentPercentage).toBe(0);
    expect(result.guidanceText).not.toMatch(/safe to progress|injury risk|overtraining|optimal/i);
  });

  it('rejects invalid or absent numerical evidence', () => {
    const result = calculateAdaptiveRecommendation({ acwr: Number.NaN, chronic: 40, acute: 50, rpe: 6 });
    expect(result.adjustmentPercentage).toBe(0);
    expect(result.guidanceText).toMatch(/invalid or incomplete/);
  });
});
